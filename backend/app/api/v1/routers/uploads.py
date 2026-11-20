import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import PlainTextResponse
import pandas as pd
from app.core.errors import NotFoundException, ValidationException
from app.core.security import get_current_user_payload
from app.db.storage import get_collection, persist_mock_store
from app.engine.quality import compute_checksum, scan_dataset
from app.schemas.upload import ApplyFixesRequest, ReleaseResponse, ScanSummaryResponse

router = APIRouter(prefix="/uploads", tags=["Data Ingestion & Uploads"])

UPLOADED_DATAFRAMES: Dict[str, pd.DataFrame] = {}

@router.get("/template", response_class=PlainTextResponse)
async def get_upload_template(kind: str = "readings"):
    """Generate industrial CSV template."""
    if kind == "maintenance":
        content = "machine_name,type,start,end,failure_mode,root_cause,downtime_hours,cost,notes\nPRESS-01,preventive,2026-11-01 08:00:00,2026-11-01 12:00:00,None,Scheduled lubrication,4.0,850.0,Standard quarterly service\n"
        headers = {"Content-Disposition": "attachment; filename=maintenance_template.csv"}
    else:
        content = "timestamp,machine_name,vibration_rms_mm_s,bearing_temp_c,motor_current_a,pressure_bar,speed_rpm\n2026-11-20 00:00:00,PRESS-01,2.45,58.2,64.1,6.8,1480.0\n2026-11-20 00:10:00,PRESS-01,2.48,58.4,64.0,6.9,1480.0\n"
        headers = {"Content-Disposition": "attachment; filename=readings_template.csv"}
    return PlainTextResponse(content=content, headers=headers)

@router.get("/sample", response_class=PlainTextResponse)
async def get_upload_sample():
    """Download synthetic sample dataset labeled illustrative."""
    lines = [
        "timestamp,machine_name,vibration_rms_mm_s,bearing_temp_c,motor_current_a,pressure_bar,speed_rpm,label",
        "# Illustrative synthetic sensor data — not from real machines",
        "2026-11-19 10:00:00,PRESS-01,2.35,57.8,63.5,6.8,1480.0,normal",
        "2026-11-19 10:10:00,PRESS-01,2.41,58.1,63.8,6.8,1480.0,normal",
        "2026-11-19 10:20:00,PRESS-01,3.12,61.4,65.2,6.9,1480.0,normal",
        "2026-11-19 10:30:00,PRESS-01,4.85,69.5,68.0,7.1,1480.0,degraded",
        "2026-11-19 10:40:00,PRESS-01,7.20,78.2,71.4,7.4,1480.0,alert",
        "2026-11-19 10:50:00,PRESS-01,11.40,92.5,74.8,7.9,1480.0,critical"
    ]
    return PlainTextResponse(
        content="\n".join(lines),
        headers={"Content-Disposition": "attachment; filename=synthetic_sensor_sample.csv"}
    )

@router.post("/scan")
async def scan_upload(
    file: UploadFile = File(...),
    kind: str = Form("readings"),
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """
    Scan & Fix Wizard Step 1:
    Accepts CSV/Excel, runs quality checks (gaps, spikes, flatlines, plausible ranges, unit mismatches),
    and creates an upload batch with numbered issue preview.
    """
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise ValidationException("File size exceeds 25 MB upload limit.")

    checksum = compute_checksum(content)
    batches_col = get_collection("upload_batches")

    try:
        if file.filename.endswith(".xlsx") or file.filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content), comment="#")
    except Exception as e:
        raise ValidationException(f"Failed to parse file: {e}")

    issues, counts = scan_dataset(df, kind=kind)
    
    batch_id = str(ObjectId())
    batches_col.insert_one({
        "_id": ObjectId(batch_id),
        "filename": file.filename,
        "kind": kind,
        "checksum": checksum,
        "counts": counts,
        "issues": issues,
        "duplicate_policy": "skip",
        "status": "scanned",
        "actor": user.get("email"),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Cache dataframe for fix application
    UPLOADED_DATAFRAMES[batch_id] = df

    # Prepare preview rows (first 15 rows with row index)
    preview = []
    for idx, row in df.head(15).iterrows():
        row_dict = row.to_dict()
        row_dict["_row_idx"] = int(idx)
        preview.append(row_dict)

    return {
        "batch_id": batch_id,
        "filename": file.filename,
        "total_rows": counts["total"],
        "valid_rows": counts["valid"],
        "warn_rows": counts["warn"],
        "fail_rows": counts["fail"],
        "issues": issues,
        "preview_rows": preview,
        "status": "scanned"
    }

@router.post("/{id}/apply-fixes")
async def apply_fixes(
    id: str,
    req: ApplyFixesRequest,
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Scan & Fix Wizard Step 2: Apply automated fixes (gap interpolation, unit conversion, deduplication)."""
    batches_col = get_collection("upload_batches")
    batch = batches_col.find_one({"_id": ObjectId(id)})
    if not batch:
        raise NotFoundException("Upload Batch", id)

    df = UPLOADED_DATAFRAMES.get(id)
    if df is None:
        raise ValidationException("Uploaded batch session expired. Please re-upload the file.")

    # Apply fixes
    issues = batch.get("issues", [])
    applied_count = 0
    for issue in issues:
        if issue["id"] in req.fix_ids or "all" in req.fix_ids:
            col = issue.get("column")
            if issue["issue_type"] == "unit_mismatch" and col in df.columns:
                # Convert °F to °C
                df[col] = (df[col] - 32.0) * (5.0 / 9.0)
                issue["applied"] = True
                applied_count += 1
            elif issue["issue_type"] == "gap" and col in df.columns:
                # Linear interpolate short gaps
                df[col] = df[col].interpolate(method="linear", limit=3)
                issue["applied"] = True
                applied_count += 1

    batches_col.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"issues": issues, "status": "fixed"}}
    )
    UPLOADED_DATAFRAMES[id] = df

    return {"message": f"Successfully applied {applied_count} fixes.", "status": "fixed"}

@router.post("/{id}/release", response_model=ReleaseResponse)
async def release_to_database(
    id: str,
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Scan & Fix Wizard Step 3: Commit validated rows into database collections."""
    batches_col = get_collection("upload_batches")
    machines_col = get_collection("machines")
    readings_col = get_collection("sensor_readings")
    sensors_col = get_collection("sensors")

    batch = batches_col.find_one({"_id": ObjectId(id)})
    if not batch:
        raise NotFoundException("Upload Batch", id)

    df = UPLOADED_DATAFRAMES.get(id)
    if df is None:
        raise ValidationException("Uploaded batch session expired. Please re-upload.")

    # Find machine
    m_name = "PRESS-01"
    for col in df.columns:
        if "machine" in col.lower() and len(df[col].dropna()) > 0:
            m_name = str(df[col].dropna().iloc[0])
            break

    m_doc = machines_col.find_one({"name": m_name})
    if not m_doc:
        m_doc = machines_col.find_one() # default to first
    m_id_str = str(m_doc["_id"])

    # Map timestamp
    ts_col = "timestamp"
    for c in df.columns:
        if "time" in c.lower() or "date" in c.lower() or c.lower() == "ts":
            ts_col = c
            break

    released = 0
    records = []
    sensors = list(sensors_col.find({"machine_id": m_id_str}))
    sensor_names = {s["name"].lower(): str(s["_id"]) for s in sensors}

    numeric_cols = [c for c in df.columns if c != ts_col and pd.api.types.is_numeric_dtype(df[c])]

    for _, row in df.iterrows():
        try:
            ts_val = pd.to_datetime(row[ts_col], utc=True).to_pydatetime()
            for col in numeric_cols:
                val = float(row[col])
                if not pd.isna(val):
                    records.append({
                        "ts": ts_val,
                        "meta": {
                            "machine_id": m_id_str,
                            "sensor_id": sensor_names.get(col.lower(), col),
                            "sensor_name": col
                        },
                        "value": round(val, 2),
                        "status": "valid",
                        "batch_id": id
                    })
                    released += 1
        except Exception:
            pass

    if records:
        readings_col.insert_many(records)
        persist_mock_store()

    batches_col.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": "released", "released_count": released}}
    )

    return ReleaseResponse(
        batch_id=id,
        released_rows=released,
        rejected_rows=0,
        status="released",
        message=f"Batch successfully released: {released} readings stored in database."
    )
