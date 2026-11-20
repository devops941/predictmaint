from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class MaintenanceEventCreate(BaseModel):
    machine_id: str
    type: str = Field(..., description="preventive, corrective, inspection, replacement")
    start: datetime
    end: datetime
    failure_mode: Optional[str] = None
    root_cause: Optional[str] = None
    parts: List[str] = Field(default_factory=list)
    downtime_hours: float = 0.0
    cost: float = 0.0
    notes: Optional[str] = None

class MaintenanceEventResponse(BaseModel):
    id: str
    machine_id: str
    machine_name: Optional[str] = None
    type: str
    start: datetime
    end: datetime
    failure_mode: Optional[str] = None
    root_cause: Optional[str] = None
    parts: List[str]
    downtime_hours: float
    cost: float
    notes: Optional[str] = None
    entered_by: Optional[str] = None
    created_at: datetime
