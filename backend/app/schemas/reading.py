from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class ReadingPoint(BaseModel):
    sensor_id: str
    value: float
    status: str = "valid"  # valid, flagged, imputed

class QuickReadingCreate(BaseModel):
    machine_id: str
    ts: datetime
    readings: List[ReadingPoint]

class ReadingRow(BaseModel):
    ts: datetime
    values: Dict[str, float]  # sensor_name -> value

class ReadingGridCreate(BaseModel):
    machine_id: str
    rows: List[ReadingRow]

class ReadingQueryResponse(BaseModel):
    machine_id: str
    sensor_ids: List[str]
    start_ts: datetime
    end_ts: datetime
    resolution: str
    total_points: int
    data: List[Dict[str, Any]]
