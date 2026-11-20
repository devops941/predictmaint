from datetime import datetime, timezone
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from app.core.security import RequireRole, get_current_user_payload
from app.db.storage import get_collection

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("", dependencies=[Depends(RequireRole(["Admin"]))])
async def list_audit_logs():
    """Admin: Retrieve immutable compliance and change logs."""
    audit_col = get_collection("audit_logs")
    docs = list(audit_col.find().sort("created_at", -1).limit(100))
    return [
        {
            "id": str(d["_id"]),
            "actor": d.get("actor", "system"),
            "action": d.get("action", "ACTION"),
            "resource": d.get("resource", "system"),
            "metadata": d.get("metadata", {}),
            "created_at": d.get("created_at", datetime.now(timezone.utc))
        }
        for d in docs
    ]
