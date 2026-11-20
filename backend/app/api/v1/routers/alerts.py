from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends
from app.core.errors import NotFoundException
from app.core.security import get_current_user_payload
from app.db.storage import get_collection, persist_mock_store

router = APIRouter(prefix="/alerts", tags=["Alarms & Alerts"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_alerts(
    status: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    alerts_col = get_collection("alerts")
    query = {"status": status} if status else {}
    docs = list(alerts_col.find(query).sort("opened_at", -1))
    return [
        {
            "id": str(d["_id"]),
            "machine_id": d.get("machine_id"),
            "machine_name": d.get("machine_name", "Machine"),
            "severity": d.get("severity", "Alert"),
            "risk_score": d.get("risk_score", 0.7),
            "opened_at": d.get("opened_at", datetime.now(timezone.utc)),
            "status": d.get("status", "open"),
            "top_features": d.get("top_features", []),
            "review_id": d.get("review_id")
        }
        for d in docs
    ]

@router.patch("/{id}")
async def update_alert_status(
    id: str,
    body: Dict[str, str],
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    alerts_col = get_collection("alerts")
    new_status = body.get("status", "acknowledged")
    alerts_col.update_one({"_id": ObjectId(id)}, {"$set": {"status": new_status}})
    persist_mock_store()
    return {"message": f"Alert status updated to {new_status}."}
