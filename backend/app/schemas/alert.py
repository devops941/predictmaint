from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class FeatureDeviation(BaseModel):
    feature: str
    sensor: str
    current_value: float
    baseline_value: float
    deviation_z: float
    contribution_pct: float

class AlertResponse(BaseModel):
    id: str
    machine_id: str
    machine_name: str
    severity: str  # Watch, Alert, Critical
    risk_score: float
    opened_at: datetime
    status: str    # open, acknowledged, reviewed, resolved
    prediction_id: Optional[str] = None
    top_features: List[FeatureDeviation] = Field(default_factory=list)
    review_id: Optional[str] = None

class ReviewCreateRequest(BaseModel):
    alert_id: str
    outcome: str = Field(..., description="confirmed_fault, false_alarm, needs_check")
    root_cause: str
    notes: Optional[str] = None

class ReviewResponse(BaseModel):
    id: str
    alert_id: str
    outcome: str
    root_cause: str
    notes: Optional[str] = None
    reviewer: str
    reviewed_at: datetime
