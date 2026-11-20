from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from app.core.security import get_current_user_payload
from app.db.storage import get_collection

router = APIRouter(prefix="/floor", tags=["Plant Floor"])

@router.get("", response_model=Dict[str, Any])
async def get_plant_floor_data(user: Dict[str, Any] = Depends(get_current_user_payload)):
    """
    Plant Floor Home Map:
    Returns full interactive plant layout with machine coordinates,
    health rings, risk scores, fleet dials, and line assignments.
    """
    machines_col = get_collection("machines")
    lines_col = get_collection("lines")
    alerts_col = get_collection("alerts")

    machines = list(machines_col.find())
    lines = list(lines_col.find())
    alerts = list(alerts_col.find({"status": "open"}))

    # Counters
    healthy_count = sum(1 for m in machines if m.get("state") == "Healthy")
    watch_count = sum(1 for m in machines if m.get("state") == "Watch")
    alert_count = sum(1 for m in machines if m.get("state") == "Alert")
    critical_count = sum(1 for m in machines if m.get("state") == "Critical")

    # Map machines with positions
    machine_nodes = []
    for m in machines:
        m_id = str(m["_id"])
        machine_nodes.append({
            "id": m_id,
            "name": m.get("name"),
            "line_id": m.get("line_id"),
            "type": m.get("type"),
            "criticality": m.get("criticality", 3),
            "health_index": m.get("health_index", 95.0),
            "risk_score": m.get("risk_score", 0.05),
            "state": m.get("state", "Healthy"),
            "map_position": m.get("map_position", {"room": "Bay A", "x": 100, "y": 100}),
            "last_maintenance": m.get("last_maintenance")
        })

    # Top 5 at risk
    sorted_by_risk = sorted(machine_nodes, key=lambda x: x["risk_score"], reverse=True)
    top_5 = sorted_by_risk[:5]

    return {
        "fleet_counts": {
            "healthy": healthy_count,
            "watch": watch_count,
            "alert": alert_count,
            "critical": critical_count,
            "total": len(machines)
        },
        "machines": machine_nodes,
        "lines": [{"id": str(l["_id"]), "name": l.get("name"), "code": l.get("code")} for l in lines],
        "top_5_at_risk": top_5,
        "active_alerts_count": len(alerts)
    }
