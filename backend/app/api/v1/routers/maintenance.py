from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Query
from app.core.errors import NotFoundException, ValidationException
from app.core.security import get_current_user_payload, verify_line_access
from app.db.storage import get_collection, persist_mock_store
from app.engine.validation import parse_and_utc_timestamp
from app.schemas.maintenance import MaintenanceEventCreate, MaintenanceEventResponse

router = APIRouter(prefix="/maintenance-events", tags=["Maintenance Events"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_maintenance_events(
    machine_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    maint_col = get_collection("maintenance_events")
    machines_col = get_collection("machines")

    query = {}
    if machine_id:
        m_doc = machines_col.find_one({"_id": ObjectId(machine_id)}) if ObjectId.is_valid(machine_id) else machines_col.find_one({"name": machine_id})
        if m_doc:
            verify_line_access(user, m_doc.get("line_id"))
        query["machine_id"] = machine_id

    docs = list(maint_col.find(query).sort("start", -1))
    
    # Map machine names
    m_ids = list({d.get("machine_id") for d in docs if d.get("machine_id")})
    machines_map = {}
    for mid in m_ids:
        if ObjectId.is_valid(mid):
            m = machines_col.find_one({"_id": ObjectId(mid)})
            if m:
                machines_map[mid] = m.get("name")

    return [
        {
            "id": str(d["_id"]),
            "machine_id": d.get("machine_id"),
            "machine_name": machines_map.get(d.get("machine_id"), "Machine"),
            "type": d.get("type"),
            "start": d.get("start"),
            "end": d.get("end"),
            "failure_mode": d.get("failure_mode"),
            "root_cause": d.get("root_cause"),
            "parts": d.get("parts", []),
            "downtime_hours": d.get("downtime_hours", 0.0),
            "cost": d.get("cost", 0.0),
            "notes": d.get("notes"),
            "entered_by": d.get("entered_by", "Technician"),
            "created_at": d.get("created_at", datetime.now(timezone.utc))
        }
        for d in docs
    ]

@router.post("")
async def create_maintenance_event(
    req: MaintenanceEventCreate,
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    machines_col = get_collection("machines")
    maint_col = get_collection("maintenance_events")

    m_doc = machines_col.find_one({"_id": ObjectId(req.machine_id)}) if ObjectId.is_valid(req.machine_id) else machines_col.find_one({"name": req.machine_id})
    if not m_doc:
        raise NotFoundException("Machine", req.machine_id)
    verify_line_access(user, m_doc.get("line_id"))

    st = parse_and_utc_timestamp(req.start)
    et = parse_and_utc_timestamp(req.end)
    if et < st:
        raise ValidationException("End time must be after or equal to start time.")

    doc = {
        "machine_id": str(m_doc["_id"]),
        "type": req.type,
        "start": st,
        "end": et,
        "failure_mode": req.failure_mode,
        "root_cause": req.root_cause,
        "parts": req.parts,
        "downtime_hours": req.downtime_hours,
        "cost": req.cost,
        "notes": req.notes,
        "entered_by": user.get("email", "Operator"),
        "created_at": datetime.now(timezone.utc)
    }
    res = maint_col.insert_one(doc)

    # Update machine last_maintenance
    machines_col.update_one(
        {"_id": m_doc["_id"]},
        {"$set": {"last_maintenance": et.isoformat()}}
    )
    persist_mock_store()

    return {"id": str(res.inserted_id), "message": "Maintenance work order recorded."}
