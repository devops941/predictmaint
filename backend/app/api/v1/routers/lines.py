from typing import Any, Dict, List
from bson import ObjectId
from fastapi import APIRouter, Depends
from app.core.security import get_current_user_payload
from app.db.storage import get_collection

router = APIRouter(tags=["Plants & Lines"])

@router.get("/plants")
async def list_plants(user: Dict[str, Any] = Depends(get_current_user_payload)):
    plants_col = get_collection("plants")
    docs = list(plants_col.find())
    return [
        {
            "id": str(d["_id"]),
            "name": d.get("name"),
            "location": d.get("location")
        }
        for d in docs
    ]

@router.get("/lines")
async def list_lines(user: Dict[str, Any] = Depends(get_current_user_payload)):
    lines_col = get_collection("lines")
    role = user.get("role")
    
    query: Dict[str, Any] = {}
    if role == "Technician":
        query["_id"] = {"$in": [ObjectId(lid) for lid in user.get("line_ids", []) if ObjectId.is_valid(lid)]}

    docs = list(lines_col.find(query))
    return [
        {
            "id": str(d["_id"]),
            "plant_id": d.get("plant_id"),
            "name": d.get("name"),
            "code": d.get("code")
        }
        for d in docs
    ]
