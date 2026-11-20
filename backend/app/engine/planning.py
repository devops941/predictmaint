from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

def calculate_maintenance_priorities(
    machines: List[Dict[str, Any]],
    planned_shutdowns: List[Dict[str, Any]],
    horizon_hours: int = 72
) -> List[Dict[str, Any]]:
    """
    Compute ranked maintenance plan:
    Priority = P(failure within H) * criticality * downtime_cost_per_hour * expected_downtime_hours
    Aligns suggested inspection windows with planned plant shutdown calendar.
    """
    plan_items = []
    now = datetime.now(timezone.utc)

    for m in machines:
        risk_prob = float(m.get("risk_score", 0.1))
        criticality = int(m.get("criticality", 3))
        downtime_cost = float(m.get("downtime_cost_per_hour", 5000.0))
        expected_downtime_hours = float(m.get("expected_downtime_hours", 4.0))

        # Formula: Priority = P(fail) * Crit * Cost * Hours
        priority_score = risk_prob * criticality * downtime_cost * expected_downtime_hours

        # Find best matching shutdown window
        suggested_start = now + timedelta(hours=24)
        suggested_end = suggested_start + timedelta(hours=expected_downtime_hours)
        rationale = f"High risk of failure ({int(risk_prob*100)}%) within {horizon_hours}h. Criticality level {criticality}."

        for sd in planned_shutdowns:
            st = sd.get("start")
            et = sd.get("end")
            if st and et:
                if isinstance(st, str):
                    st = datetime.fromisoformat(st.replace("Z", "+00:00"))
                if isinstance(et, str):
                    et = datetime.fromisoformat(et.replace("Z", "+00:00"))
                if st > now:
                    suggested_start = st
                    suggested_end = st + timedelta(hours=expected_downtime_hours)
                    rationale += f" Aligned with planned line shutdown '{sd.get('name', 'Scheduled maintenance')}'."
                    break

        action = "Full bearing assembly inspection & vibration re-check" if risk_prob > 0.6 else "Lubrication check & thermography scan"

        plan_items.append({
            "id": f"plan_{m.get('_id', m.get('id', 'm'))}",
            "machine_id": str(m.get("_id", m.get("id"))),
            "machine_name": m.get("name", "Machine"),
            "priority_score": round(priority_score, 2),
            "risk_prob": round(risk_prob, 3),
            "criticality": criticality,
            "downtime_cost": downtime_cost,
            "window_start": suggested_start,
            "window_end": suggested_end,
            "suggested_action": action,
            "rationale": rationale,
            "status": "suggested"
        })

    # Sort descending by priority score
    plan_items.sort(key=lambda x: x["priority_score"], reverse=True)
    return plan_items
