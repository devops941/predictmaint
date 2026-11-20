from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field

class ReportGenerateRequest(BaseModel):
    kind: str = Field(..., description="machine_health, fleet_weekly, model_pack, maintenance_plan")
    model_id: Optional[str] = None
    machine_id: Optional[str] = None
    format: str = "pdf"  # pdf, excel, csv

class ReportResponse(BaseModel):
    id: str
    kind: str
    title: str
    format: str
    status: str  # queued, generating, ready, failed
    size_bytes: int = 0
    created_at: datetime
    download_url: str
