from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends
from app.core.security import RequireRole, get_current_user_payload
from app.db.storage import get_collection, persist_mock_store
from app.engine.planning import calculate_maintenance_priorities
from app.schemas.plan import PlanItemResponse, PlanItemUpdateRequest

router = APIRouter(prefix="/plan", tags=["Maintenance Planning"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_maintenance_plan(user: Dict[str, Any] = Depends(get_current_user_payload)):
    """Office: Returns ranked maintenance plan items sorted by Priority score."""
    plan_col = get_collection("plan_items")
    docs = list(plan_col.find().sort("priority_score", -1))
    return [
        {
            "id": str(d["_id"]),
            "machine_id": d.get("machine_id"),
            "machine_name": d.get("machine_name"),
            "priority_score": d.get("priority_score", 0.0),
            "risk_prob": d.get("risk_prob", 0.1),
            "criticality": d.get("criticality", 3),
            "downtime_cost": d.get("downtime_cost", 5000.0),
            "window_start": d.get("window_start"),
            "window_end": d.get("window_end"),
            "suggested_action": d.get("suggested_action", "Inspection"),
            "rationale": d.get("rationale", ""),
            "status": d.get("status", "suggested"),
            "approved_by": d.get("approved_by")
        }
        for d in docs
    ]

@router.patch("/{id}")
async def update_plan_item(
    id: str,
    req: PlanItemUpdateRequest,
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    plan_col = get_collection("plan_items")
    update_data: Dict[str, Any] = {"status": req.status}
    if req.status == "approved":
        update_data["approved_by"] = user.get("name", user.get("email"))
    if req.rescheduled_start and req.rescheduled_end:
        update_data["window_start"] = req.rescheduled_start
        update_data["window_end"] = req.rescheduled_end

    plan_col.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    persist_mock_store()
    return {"message": f"Plan item status updated to {req.status}."}
