from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user_payload
from app.db.storage import get_collection
from app.schemas.machine import SensorCreate

router = APIRouter(prefix="/sensors", tags=["Sensors"])

@router.get("")
async def list_sensors(
    machine_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    sensors_col = get_collection("sensors")
    query = {"machine_id": machine_id} if machine_id else {}
    docs = list(sensors_col.find(query))
    return [
        {
            "id": str(d["_id"]),
            "machine_id": d.get("machine_id"),
            "name": d.get("name"),
            "type": d.get("type"),
            "unit": d.get("unit"),
            "min_val": d.get("min_val"),
            "max_val": d.get("max_val"),
            "sampling_seconds": d.get("sampling_seconds", 600)
        }
        for d in docs
    ]
