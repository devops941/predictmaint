from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class SensorCreate(BaseModel):
    name: str
    type: str  # vibration, temperature, current, pressure, speed
    unit: str  # mm/s, °C, A, bar, rpm
    min_val: float
    max_val: float
    sampling_seconds: int = 600

class SensorResponse(BaseModel):
    id: str
    machine_id: str
    name: str
    type: str
    unit: str
    min_val: float
    max_val: float
    sampling_seconds: int

class MapPosition(BaseModel):
    room: str = "Bay A"
    x: int = 100
    y: int = 100

class MachineCreate(BaseModel):
    line_id: str
    name: str
    type: str  # pump, motor, compressor, conveyor, gearbox
    manufacturer: str
    install_date: str
    criticality: int = Field(ge=1, le=5, default=3)
    downtime_cost_per_hour: float = 5000.0
    map_position: MapPosition = Field(default_factory=MapPosition)
    sensors: List[SensorCreate] = Field(default_factory=list)

class MachineResponse(BaseModel):
    id: str
    line_id: str
    name: str
    type: str
    manufacturer: str
    install_date: str
    criticality: int
    downtime_cost_per_hour: float
    map_position: MapPosition
    active: bool = True
    health_index: float = 100.0
    risk_score: float = 0.0
    state: str = "Healthy"  # Healthy, Watch, Alert, Critical
    sensors: List[SensorResponse] = Field(default_factory=list)
    last_maintenance: Optional[str] = None

class PlantResponse(BaseModel):
    id: str
    name: str
    location: str

class LineResponse(BaseModel):
    id: str
    plant_id: str
    name: str
    calendar: List[Dict[str, Any]] = Field(default_factory=list)
