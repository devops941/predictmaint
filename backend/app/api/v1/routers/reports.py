import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Response
from fastapi.responses import PlainTextResponse, StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from app.core.security import get_current_user_payload
from app.db.storage import get_collection, persist_mock_store
from app.schemas.report import ReportGenerateRequest

router = APIRouter(prefix="/reports", tags=["Reports & Print Queue"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_reports(user: Dict[str, Any] = Depends(get_current_user_payload)):
    """Dispatch: List report press queue."""
    reports_col = get_collection("reports")
    docs = list(reports_col.find().sort("created_at", -1))
    return [
        {
            "id": str(d["_id"]),
            "kind": d.get("kind"),
            "title": d.get("title"),
            "format": d.get("format", "pdf"),
            "status": d.get("status", "ready"),
            "size_bytes": d.get("size_bytes", 24500),
            "created_at": d.get("created_at", datetime.now(timezone.utc)),
            "download_url": f"/api/v1/reports/{str(d['_id'])}/download"
        }
        for d in docs
    ]

@router.post("")
async def generate_report(
    req: ReportGenerateRequest,
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Dispatch: Run report press job for 4 templates."""
    reports_col = get_collection("reports")
    now = datetime.now(timezone.utc)
    
    titles = {
        "machine_health": "Machine Health & Degradation Dossier",
        "fleet_weekly": "Plant Fleet Weekly Reliability Briefing",
        "model_pack": "Model Validation & Performance Pack",
        "maintenance_plan": "Prioritized Maintenance Action Schedule"
    }
    title = titles.get(req.kind, "Industrial Reliability Report")

    doc = {
        "kind": req.kind,
        "title": title,
        "format": req.format.lower(),
        "status": "ready",
        "size_bytes": 48200 if req.format.lower() == "pdf" else 15300,
        "created_at": now
    }
    res = reports_col.insert_one(doc)
    persist_mock_store()
    return {"id": str(res.inserted_id), "message": f"{title} generated successfully."}

@router.get("/{id}/download")
async def download_report(id: str):
    reports_col = get_collection("reports")
    doc = reports_col.find_one({"_id": ObjectId(id)}) if ObjectId.is_valid(id) else None
    
    fmt = doc.get("format", "pdf") if doc else "pdf"
    title = doc.get("title", "PredictMaint_Report") if doc else "PredictMaint_Report"

    if fmt == "csv":
        csv_data = "Machine,Criticality,RiskScore,HealthIndex,RecommendedAction\nPRESS-01,5,0.92,18.4,Emergency Bearing Replacement\nCOMP-05,5,0.74,41.2,Screw Seal Check\n"
        return PlainTextResponse(
            content=csv_data,
            headers={"Content-Disposition": f"attachment; filename={title.replace(' ', '_')}.csv"}
        )

    # Generate professional PDF using ReportLab
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    c.setTitle(title)

    # Header plate styling
    c.setFillColorRGB(0.11, 0.12, 0.14) # graphite
    c.rect(40, 720, 530, 45, fill=1, stroke=0)
    c.setFillColorRGB(1.0, 0.42, 0.07) # hivis orange accent line
    c.rect(40, 716, 530, 4, fill=1, stroke=0)

    c.setFillColorRGB(1.0, 1.0, 1.0)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(55, 738, f"PREDICTMAINT AI // {title.upper()}")
    c.setFont("Helvetica", 9)
    c.drawString(55, 725, f"FORMULA PM-V1 · GENERATED: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")

    c.setFillColorRGB(0.11, 0.12, 0.14)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(55, 680, "EXECUTIVE SUMMARY & OPERATIONAL NOTICE")
    c.setFont("Helvetica", 10)
    c.drawString(55, 660, "Advisory decision support. Inspect equipment before taking maintenance actions.")
    c.drawString(55, 642, "Synthetic verification run · All readings, metrics, and models strictly reproducible.")

    # Table of Key Findings
    c.setFont("Helvetica-Bold", 10)
    c.drawString(55, 600, "Asset")
    c.drawString(140, 600, "State")
    c.drawString(220, 600, "Health Index")
    c.drawString(310, 600, "Failure Risk (72h)")
    c.drawString(430, 600, "Recommended Priority")
    c.setStrokeColorRGB(0.8, 0.82, 0.85)
    c.line(55, 592, 550, 592)

    rows = [
        ("PRESS-01", "CRITICAL", "18.4 / 100", "92.0%", "Priority #1 (Immediate)"),
        ("COMP-05", "ALERT", "41.2 / 100", "74.0%", "Priority #2 (High)"),
        ("GEAR-07", "WATCH", "64.5 / 100", "46.0%", "Priority #3 (Next Window)"),
        ("MOTOR-02", "HEALTHY", "94.2 / 100", "8.0%", "Normal Operation"),
    ]
    y = 575
    for asset, st, hi, risk, prio in rows:
        c.setFont("Helvetica", 9)
        c.drawString(55, y, asset)
        c.drawString(140, y, st)
        c.drawString(220, y, hi)
        c.drawString(310, y, risk)
        c.drawString(430, y, prio)
        y -= 22

    c.line(55, y + 10, 550, y + 10)

    # Footer notice
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColorRGB(0.5, 0.55, 0.6)
    c.drawString(55, 50, "PredictMaint AI · Sensor-Driven Industrial Equipment Intelligence · Confidential Plant Report")

    c.showPage()
    c.save()
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={title.replace(' ', '_')}.pdf"}
    )
