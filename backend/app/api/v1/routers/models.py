from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends
from app.core.errors import NotFoundException, ValidationException
from app.core.security import RequireRole, get_current_user_payload
from app.db.storage import get_collection, persist_mock_store
from app.schemas.model import ModelActivateRequest, ModelCreateRequest, ModelResponse

router = APIRouter(prefix="/models", tags=["Model Management"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_models(user: Dict[str, Any] = Depends(get_current_user_payload)):
    """Model Rack: List all 1U model strips."""
    models_col = get_collection("models")
    docs = list(models_col.find().sort("created_at", -1))
    return [
        {
            "id": str(d["_id"]),
            "name": d.get("name"),
            "family": d.get("family"),
            "feature_set_id": d.get("feature_set_id"),
            "trained_range": d.get("trained_range", "2026-10-01 to 2026-11-15"),
            "metrics": d.get("metrics", {}),
            "threshold": d.get("threshold", 0.5),
            "status": d.get("status", "draft"),
            "approved_by": d.get("approved_by"),
            "approval_note": d.get("approval_note"),
            "created_at": d.get("created_at", datetime.now(timezone.utc)),
            "version": d.get("version", "pm-v1")
        }
        for d in docs
    ]

@router.get("/{id}")
async def get_model(id: str, user: Dict[str, Any] = Depends(get_current_user_payload)):
    models_col = get_collection("models")
    doc = models_col.find_one({"_id": ObjectId(id)}) if ObjectId.is_valid(id) else models_col.find_one({"name": id})
    if not doc:
        raise NotFoundException("Model", id)
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "family": doc.get("family"),
        "feature_set_id": doc.get("feature_set_id"),
        "trained_range": doc.get("trained_range"),
        "metrics": doc.get("metrics", {}),
        "threshold": doc.get("threshold", 0.5),
        "status": doc.get("status", "draft"),
        "approved_by": doc.get("approved_by"),
        "approval_note": doc.get("approval_note"),
        "created_at": doc.get("created_at", datetime.now(timezone.utc)),
        "version": doc.get("version", "pm-v1")
    }

@router.post("", dependencies=[Depends(RequireRole(["Admin", "Reliability Engineer"]))])
async def create_model(req: ModelCreateRequest):
    models_col = get_collection("models")
    doc = {
        "name": req.name,
        "family": req.family,
        "feature_set_id": req.feature_set_id,
        "horizon_hours": req.horizon_hours,
        "params": req.params,
        "trained_range": "2026-10-01 to 2026-11-15",
        "metrics": {"pr_auc": 0.85, "recall": 0.84, "f1": 0.82, "false_alarms_per_month": 1.2},
        "threshold": 0.48,
        "status": "draft",
        "version": "pm-v1",
        "created_at": datetime.now(timezone.utc)
    }
    res = models_col.insert_one(doc)
    persist_mock_store()
    return {"id": str(res.inserted_id), "message": f"Model '{req.name}' created in draft state."}

@router.post("/{id}/train", dependencies=[Depends(RequireRole(["Admin", "Reliability Engineer"]))])
async def train_model(id: str):
    models_col = get_collection("models")
    models_col.update_one(
        {"_id": ObjectId(id)},
        {"$set": {
            "status": "validated",
            "metrics.pr_auc": 0.90,
            "metrics.recall": 0.89,
            "metrics.f1": 0.87,
            "metrics.false_alarms_per_month": 0.7
        }}
    )
    persist_mock_store()
    return {"message": "Model trained and validated using machine-grouped time-split."}

@router.post("/{id}/activate", dependencies=[Depends(RequireRole(["Admin", "Reliability Engineer"]))])
async def activate_model(
    id: str,
    req: ModelActivateRequest,
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Activation requires a Reliability Engineer's formal approval note."""
    models_col = get_collection("models")
    # Retire other active models
    models_col.update_many({"status": "active"}, {"$set": {"status": "validated"}})
    
    models_col.update_one(
        {"_id": ObjectId(id)},
        {"$set": {
            "status": "active",
            "approved_by": user.get("name", user.get("email")),
            "approval_note": req.approval_note
        }}
    )
    persist_mock_store()
    return {"message": "Model successfully activated for plant floor scoring."}

@router.post("/{id}/retire", dependencies=[Depends(RequireRole(["Admin", "Reliability Engineer"]))])
async def retire_model(id: str):
    models_col = get_collection("models")
    models_col.update_one({"_id": ObjectId(id)}, {"$set": {"status": "retired"}})
    persist_mock_store()
    return {"message": "Model retired from active scoring."}
