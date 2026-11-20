from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class PlanItemResponse(BaseModel):
    id: str
    machine_id: str
    machine_name: str
    priority_score: float
    risk_prob: float
    criticality: int
    downtime_cost: float
    window_start: datetime
    window_end: datetime
    suggested_action: str
    rationale: str
    status: str = "suggested"  # suggested, approved, done
    approved_by: Optional[str] = None

class PlanItemUpdateRequest(BaseModel):
    status: str = Field(..., description="suggested, approved, done")
    rescheduled_start: Optional[datetime] = None
    rescheduled_end: Optional[datetime] = None
