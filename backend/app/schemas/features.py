from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class FeatureSpec(BaseModel):
    name: str
    group: str  # statistical, frequency, ratio, operational, maintenance
    importance: float = 0.0
    missing_pct: float = 0.0
    leakage_passed: bool = True

class FeatureSetBuildRequest(BaseModel):
    name: str
    machine_ids: List[str] = Field(default_factory=list)
    window_minutes: int = 60
    step_minutes: int = 10
    horizon_hours: int = 72
    include_fft: bool = True
    baseline_days: int = 14

class FeatureSetResponse(BaseModel):
    id: str
    name: str
    version: str = "pm-v1"
    window_minutes: int
    step_minutes: int
    horizon_hours: int
    features: List[FeatureSpec]
    row_count: int
    created_at: datetime
    status: str = "completed"
