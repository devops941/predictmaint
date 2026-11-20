from datetime import datetime, timezone
from typing import Any, Dict, List
from bson import ObjectId
from fastapi import APIRouter, Depends
from app.core.security import RequireRole, hash_password
from app.db.storage import get_collection, persist_mock_store
from app.schemas.auth import UserCreate, UserUpdate

router = APIRouter(prefix="/users", tags=["User Management"])

@router.get("", dependencies=[Depends(RequireRole(["Admin"]))])
async def list_users():
    users_col = get_collection("users")
    docs = list(users_col.find())
    return [
        {
            "id": str(d["_id"]),
            "email": d.get("email"),
            "name": d.get("name"),
            "role": d.get("role"),
            "line_ids": d.get("line_ids", []),
            "status": d.get("status", "active"),
            "created_at": d.get("created_at", datetime.now(timezone.utc))
        }
        for d in docs
    ]

@router.post("", dependencies=[Depends(RequireRole(["Admin"]))])
async def create_user(req: UserCreate):
    users_col = get_collection("users")
    pwd = req.password or "PredictMaint2026!"
    doc = {
        "email": req.email.lower().strip(),
        "name": req.name,
        "role": req.role,
        "line_ids": req.line_ids,
        "password_hash": hash_password(pwd),
        "status": "active",
        "must_change_password": True,
        "created_at": datetime.now(timezone.utc)
    }
    res = users_col.insert_one(doc)
    persist_mock_store()
    return {"id": str(res.inserted_id), "message": f"User {req.email} created."}

@router.patch("/{id}", dependencies=[Depends(RequireRole(["Admin"]))])
async def update_user(id: str, req: UserUpdate):
    users_col = get_collection("users")
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if update_data:
        users_col.update_one({"_id": ObjectId(id)}, {"$set": update_data})
        persist_mock_store()
    return {"message": "User updated successfully."}
