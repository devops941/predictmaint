from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Query
from app.core.errors import NotFoundException
from app.core.security import RequireRole, get_current_user_payload, verify_line_access
from app.db.storage import get_collection, persist_mock_store
from app.engine.models import estimate_rul_hours
from app.schemas.machine import MachineCreate, MachineResponse, MapPosition, SensorResponse

router = APIRouter(prefix="/machines", tags=["Machines"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_machines(
    line_id: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    machines_col = get_collection("machines")
    sensors_col = get_collection("sensors")
    
    query: Dict[str, Any] = {}
    if line_id:
        verify_line_access(user, line_id)
        query["line_id"] = line_id
    elif user.get("role") == "Technician":
        query["line_id"] = {"$in": user.get("line_ids", [])}

    docs = list(machines_col.find(query))
    results = []
    for d in docs:
        m_id = str(d["_id"])
        # Fetch sensors for this machine
        sensors = list(sensors_col.find({"machine_id": m_id}))
        results.append({
            "id": m_id,
            "line_id": d.get("line_id"),
            "name": d.get("name"),
            "type": d.get("type"),
            "manufacturer": d.get("manufacturer"),
            "install_date": d.get("install_date"),
            "criticality": d.get("criticality", 3),
            "downtime_cost_per_hour": d.get("downtime_cost_per_hour", 5000.0),
            "map_position": d.get("map_position", {"room": "Bay A", "x": 100, "y": 100}),
            "active": d.get("active", True),
            "health_index": d.get("health_index", 95.0),
            "risk_score": d.get("risk_score", 0.1),
            "state": d.get("state", "Healthy"),
            "last_maintenance": d.get("last_maintenance"),
            "sensors": [
                {
                    "id": str(s["_id"]),
                    "machine_id": m_id,
                    "name": s["name"],
                    "type": s["type"],
                    "unit": s["unit"],
                    "min_val": s["min_val"],
                    "max_val": s["max_val"],
                    "sampling_seconds": s.get("sampling_seconds", 600)
                }
                for s in sensors
            ]
        })
    return results

@router.get("/{id}")
async def get_machine(id: str, user: Dict[str, Any] = Depends(get_current_user_payload)):
    machines_col = get_collection("machines")
    sensors_col = get_collection("sensors")
    
    doc = machines_col.find_one({"_id": ObjectId(id)}) if ObjectId.is_valid(id) else machines_col.find_one({"name": id})
    if not doc:
        raise NotFoundException("Machine", id)
    
    verify_line_access(user, doc.get("line_id"))
    m_id = str(doc["_id"])
    sensors = list(sensors_col.find({"machine_id": m_id}))

    return {
        "id": m_id,
        "line_id": doc.get("line_id"),
        "name": doc.get("name"),
        "type": doc.get("type"),
        "manufacturer": doc.get("manufacturer"),
        "install_date": doc.get("install_date"),
        "criticality": doc.get("criticality"),
        "downtime_cost_per_hour": doc.get("downtime_cost_per_hour"),
        "map_position": doc.get("map_position"),
        "active": doc.get("active", True),
        "health_index": doc.get("health_index", 95.0),
        "risk_score": doc.get("risk_score", 0.1),
        "state": doc.get("state", "Healthy"),
        "last_maintenance": doc.get("last_maintenance"),
        "sensors": [
            {
                "id": str(s["_id"]),
                "machine_id": m_id,
                "name": s["name"],
                "type": s["type"],
                "unit": s["unit"],
                "min_val": s["min_val"],
                "max_val": s["max_val"],
                "sampling_seconds": s.get("sampling_seconds", 600)
            }
            for s in sensors
        ]
    }

@router.get("/{id}/passport")
async def get_machine_passport(id: str, user: Dict[str, Any] = Depends(get_current_user_payload)):
    """
    Returns full Machine Passport with:
    - 3 Dials: Health Index, Failure Risk next H h, Indicative RUL (hours + CI)
    - Sensor readings strip-chart timeline
    - Why-flagged top deviations
    - Maintenance history
    """
    machines_col = get_collection("machines")
    sensors_col = get_collection("sensors")
    readings_col = get_collection("sensor_readings")
    maint_col = get_collection("maintenance_events")
    alerts_col = get_collection("alerts")

    doc = machines_col.find_one({"_id": ObjectId(id)}) if ObjectId.is_valid(id) else machines_col.find_one({"name": id})
    if not doc:
        raise NotFoundException("Machine", id)

    m_id = str(doc["_id"])
    verify_line_access(user, doc.get("line_id"))

    # Sensors
    sensors = list(sensors_col.find({"machine_id": m_id}))
    sensor_map = {str(s["_id"]): s for s in sensors}

    # Readings: fetch recent 120 points for strip-chart recorder
    raw_readings = list(readings_col.find({"meta.machine_id": m_id}).sort("ts", -1).limit(400))
    raw_readings.reverse()

    # Group by timestamp for shared-axis strip chart
    readings_by_ts: Dict[str, Dict[str, Any]] = {}
    for r in raw_readings:
        ts_str = r["ts"].isoformat() if isinstance(r["ts"], datetime) else str(r["ts"])
        if ts_str not in readings_by_ts:
            readings_by_ts[ts_str] = {"ts": ts_str}
        s_name = r["meta"].get("sensor_name", "sensor").lower().replace(" ", "_")
        readings_by_ts[ts_str][s_name] = r["value"]

    strip_data = list(readings_by_ts.values())

    # Maintenance history
    maint_docs = list(maint_col.find({"machine_id": m_id}).sort("start", -1))
    maint_history = [
        {
            "id": str(m["_id"]),
            "type": m.get("type"),
            "start": m.get("start"),
            "end": m.get("end"),
            "failure_mode": m.get("failure_mode"),
            "root_cause": m.get("root_cause"),
            "parts": m.get("parts", []),
            "downtime_hours": m.get("downtime_hours", 0.0),
            "cost": m.get("cost", 0.0),
            "notes": m.get("notes")
        }
        for m in maint_docs
    ]

    # Calculate RUL
    hi = float(doc.get("health_index", 90.0))
    # Simulated recent health trend for RUL calculation
    history_pts = [(0.0, hi + 4.0), (24.0, hi + 2.0), (48.0, hi)]
    rul, rul_low, rul_high = estimate_rul_hours(history_pts, fail_threshold=25.0)

    # Why flagged
    latest_alert = alerts_col.find_one({"machine_id": m_id, "status": "open"})
    why_flagged = latest_alert.get("top_features", []) if latest_alert else []

    return {
        "machine": {
            "id": m_id,
            "name": doc.get("name"),
            "type": doc.get("type"),
            "manufacturer": doc.get("manufacturer"),
            "install_date": doc.get("install_date"),
            "criticality": doc.get("criticality"),
            "downtime_cost_per_hour": doc.get("downtime_cost_per_hour"),
            "state": doc.get("state", "Healthy"),
            "last_maintenance": doc.get("last_maintenance")
        },
        "dials": {
            "health_index": hi,
            "health_state": doc.get("state", "Healthy"),
            "risk_score": doc.get("risk_score", 0.1),
            "horizon_hours": 72,
            "rul_hours": rul,
            "rul_ci": [rul_low, rul_high]
        },
        "health_index": hi,
        "risk_score": doc.get("risk_score", 0.1),
        "rul": {
            "estimated_hours": rul,
            "ci_lower": rul_low,
            "ci_upper": rul_high
        },
        "sensors": [
            {
                "id": str(s["_id"]),
                "name": s["name"],
                "type": s["type"],
                "unit": s["unit"],
                "min_val": s["min_val"],
                "max_val": s["max_val"]
            }
            for s in sensors
        ],
        "strip_chart": strip_data,
        "why_flagged": why_flagged,
        "maintenance_history": maint_history
    }

@router.post("", dependencies=[Depends(RequireRole(["Admin", "Reliability Engineer"]))])
async def create_machine(req: MachineCreate):
    machines_col = get_collection("machines")
    sensors_col = get_collection("sensors")

    m_doc = {
        "line_id": req.line_id,
        "name": req.name,
        "type": req.type,
        "manufacturer": req.manufacturer,
        "install_date": req.install_date,
        "criticality": req.criticality,
        "downtime_cost_per_hour": req.downtime_cost_per_hour,
        "map_position": req.map_position.model_dump(),
        "active": True,
        "health_index": 100.0,
        "risk_score": 0.05,
        "state": "Healthy",
        "created_at": datetime.now(timezone.utc)
    }
    res = machines_col.insert_one(m_doc)
    m_id = str(res.inserted_id)

    # Insert sensors
    for s in req.sensors:
        sensors_col.insert_one({
            "machine_id": m_id,
            "name": s.name,
            "type": s.type,
            "unit": s.unit,
            "min_val": s.min_val,
            "max_val": s.max_val,
            "sampling_seconds": s.sampling_seconds
        })

    persist_mock_store()
    return {"id": m_id, "message": f"Machine {req.name} registered successfully."}
