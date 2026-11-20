from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.core.config import settings
from app.core.security import RequireRole, get_current_user_payload

router = APIRouter(prefix="/config", tags=["System Configuration"])

APP_CONFIG_STORE = {
    "default_horizon_hours": settings.DEFAULT_HORIZON_HOURS,
    "default_cost_miss": settings.DEFAULT_COST_MISS,
    "default_cost_false": settings.DEFAULT_COST_FALSE,
    "upload_max_mb": settings.UPLOAD_MAX_MB,
    "formula_version": "pm-v1",
    "theme": "light"
}

@router.get("")
async def get_system_config(user: Dict[str, Any] = Depends(get_current_user_payload)):
    return APP_CONFIG_STORE

@router.put("", dependencies=[Depends(RequireRole(["Admin"]))])
async def update_system_config(body: Dict[str, Any]):
    APP_CONFIG_STORE.update(body)
    return {"message": "System configuration updated.", "config": APP_CONFIG_STORE}
