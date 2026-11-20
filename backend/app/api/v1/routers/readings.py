from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Query
from app.core.errors import ValidationException
from app.core.security import get_current_user_payload, verify_line_access
from app.db.storage import get_collection, persist_mock_store
from app.engine.validation import parse_and_utc_timestamp, validate_reading_point
from app.schemas.reading import QuickReadingCreate, ReadingGridCreate, ReadingQueryResponse

router = APIRouter(prefix="/readings", tags=["Sensor Readings"])

@router.get("", response_model=Dict[str, Any])
async def get_readings(
    machine_id: str,
    sensor_names: Optional[str] = None, # comma-separated
    limit: int = 500,
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    machines_col = get_collection("machines")
    readings_col = get_collection("sensor_readings")
    
    m_doc = machines_col.find_one({"_id": ObjectId(machine_id)}) if ObjectId.is_valid(machine_id) else machines_col.find_one({"name": machine_id})
    if m_doc:
        verify_line_access(user, m_doc.get("line_id"))

    query: Dict[str, Any] = {"meta.machine_id": machine_id}
    
    raw = list(readings_col.find(query).sort("ts", -1).limit(limit))
    raw.reverse()

    # Pivot by timestamp for multi-line chart consumption
    grouped: Dict[str, Dict[str, Any]] = {}
    for r in raw:
        ts_val = r["ts"].isoformat() if isinstance(r["ts"], datetime) else str(r["ts"])
        if ts_val not in grouped:
            grouped[ts_val] = {"ts": ts_val}
        s_name = r["meta"].get("sensor_name", "sensor").lower().replace(" ", "_")
        grouped[ts_val][s_name] = r["value"]

    return {
        "machine_id": machine_id,
        "total_points": len(raw),
        "data": list(grouped.values())
    }

@router.post("")
@router.post("/quick")
async def create_quick_reading(
    req: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """
    Technician quick reading entry for a single timestamp across sensors.
    Accepts both key-value dictionary of readings and list of ReadingPoint objects.
    """
    machines_col = get_collection("machines")
    sensors_col = get_collection("sensors")
    readings_col = get_collection("sensor_readings")

    machine_id = req.get("machine_id", "")
    m_doc = machines_col.find_one({"_id": ObjectId(machine_id)}) if ObjectId.is_valid(machine_id) else machines_col.find_one({"name": machine_id})
    if not m_doc:
        raise ValidationException("Invalid machine ID")
    verify_line_access(user, m_doc.get("line_id"))

    ts_raw = req.get("ts") or req.get("timestamp") or datetime.now(timezone.utc)
    dt = parse_and_utc_timestamp(ts_raw)
    inserted = 0

    readings_input = req.get("readings", {})
    if isinstance(readings_input, dict):
        for s_key, val in readings_input.items():
            s_name = s_key.replace("_", " ").title()
            s_type = "vibration" if "vib" in s_key.lower() else "temperature" if "temp" in s_key.lower() else "current" if "curr" in s_key.lower() else "pressure" if "press" in s_key.lower() else "speed"
            s_unit = "mm/s" if "vib" in s_key.lower() else "°C" if "temp" in s_key.lower() else "A" if "curr" in s_key.lower() else "bar" if "press" in s_key.lower() else "RPM"

            is_valid, reason, conv_val = validate_reading_point(s_type, float(val), s_unit)
            readings_col.insert_one({
                "ts": dt,
                "meta": {
                    "machine_id": str(m_doc["_id"]),
                    "machine_name": m_doc.get("name"),
                    "sensor_id": s_key,
                    "sensor_name": s_name
                },
                "value": conv_val,
                "status": "valid" if is_valid else "flagged"
            })
            inserted += 1
    elif isinstance(readings_input, list):
        for pt in readings_input:
            s_id = pt.get("sensor_id") if isinstance(pt, dict) else pt.sensor_id
            val = pt.get("value") if isinstance(pt, dict) else pt.value
            s_doc = sensors_col.find_one({"_id": ObjectId(s_id)}) if ObjectId.is_valid(s_id) else sensors_col.find_one({"name": s_id})
            s_name = s_doc.get("name", "Sensor") if s_doc else "Sensor"
            s_type = s_doc.get("type", "vibration") if s_doc else "vibration"
            s_unit = s_doc.get("unit", "") if s_doc else ""

            is_valid, reason, conv_val = validate_reading_point(s_type, float(val), s_unit)
            readings_col.insert_one({
                "ts": dt,
                "meta": {
                    "machine_id": str(m_doc["_id"]),
                    "machine_name": m_doc.get("name"),
                    "sensor_id": str(s_doc["_id"]) if s_doc else s_id,
                    "sensor_name": s_name
                },
                "value": conv_val,
                "status": "valid" if is_valid else "flagged"
            })
            inserted += 1

    persist_mock_store()
    return {"message": f"Successfully recorded {inserted} sensor readings."}

@router.post("/batch")
async def create_reading_grid(
    req: ReadingGridCreate,
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Reading grid: accepts multiple timestamps and sensors pasted from Excel."""
    machines_col = get_collection("machines")
    sensors_col = get_collection("sensors")
    readings_col = get_collection("sensor_readings")

    m_doc = machines_col.find_one({"_id": ObjectId(req.machine_id)}) if ObjectId.is_valid(req.machine_id) else machines_col.find_one({"name": req.machine_id})
    if not m_doc:
        raise ValidationException("Invalid machine ID")
    verify_line_access(user, m_doc.get("line_id"))

    m_id_str = str(m_doc["_id"])
    sensors = list(sensors_col.find({"machine_id": m_id_str}))
    sensor_by_name = {s["name"].lower(): s for s in sensors}

    batch = []
    for row in req.rows:
        dt = parse_and_utc_timestamp(row.ts)
        for col_name, val in row.values.items():
            match = sensor_by_name.get(col_name.lower())
            s_id = str(match["_id"]) if match else col_name
            s_name = match["name"] if match else col_name
            s_type = match.get("type", "unknown") if match else "unknown"
            s_unit = match.get("unit", "") if match else ""

            is_valid, _, conv_val = validate_reading_point(s_type, float(val), s_unit)
            batch.append({
                "ts": dt,
                "meta": {
                    "machine_id": m_id_str,
                    "sensor_id": s_id,
                    "sensor_name": s_name
                },
                "value": conv_val,
                "status": "valid" if is_valid else "flagged"
            })

    if batch:
        readings_col.insert_many(batch)
        persist_mock_store()

    return {"message": f"Grid import successful: {len(batch)} readings processed and stored."}
