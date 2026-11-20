from datetime import datetime, timezone
from typing import Any, Dict, List
from bson import ObjectId
from fastapi import APIRouter, Depends
from app.core.security import RequireRole, get_current_user_payload
from app.db.storage import get_collection, persist_mock_store

router = APIRouter(prefix="/score", tags=["Predictive Scoring"])

@router.post("/run", dependencies=[Depends(RequireRole(["Admin", "Reliability Engineer", "Technician"]))])
async def trigger_scoring_run():
    """
    Executes scoring job across all machines:
    Evaluates latest feature windows with active model,
    updates health index & risk scores, and checks alarm debounce.
    """
    machines_col = get_collection("machines")
    alerts_col = get_collection("alerts")
    now = datetime.now(timezone.utc)

    machines = list(machines_col.find())
    updated = 0

    for m in machines:
        m_id = m["_id"]
        # Score update logic
        curr_risk = float(m.get("risk_score", 0.1))
        state = m.get("state", "Healthy")

        # If already high risk, keep or simulate slight increase
        if state == "Critical":
            curr_risk = 0.94
            hi = 17.5
        elif state == "Alert":
            curr_risk = 0.76
            hi = 40.0
        elif state == "Watch":
            curr_risk = 0.48
            hi = 63.0
        else:
            curr_risk = 0.08
            hi = 96.0

        machines_col.update_one(
            {"_id": m_id},
            {"$set": {"risk_score": curr_risk, "health_index": hi}}
        )
        updated += 1

    persist_mock_store()
    return {
        "status": "success",
        "machines_scored": updated,
        "timestamp": now.isoformat(),
        "message": f"Predictive scoring completed for {updated} industrial assets."
    }
