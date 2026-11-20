from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class PRPoint(BaseModel):
    threshold: float
    precision: float
    recall: float
    f1: float

class CostPoint(BaseModel):
    threshold: float
    fn_count: int
    fp_count: int
    cost: float

class EvaluationResponse(BaseModel):
    id: str
    model_ids: List[str]
    split_info: Dict[str, Any]
    metrics_by_model: Dict[str, Dict[str, float]]
    pr_curves: Dict[str, List[PRPoint]]
    cost_curves: Dict[str, List[CostPoint]]
    optimal_thresholds: Dict[str, float]
    confusion_matrices: Dict[str, Dict[str, int]]
    lead_times_hours: Dict[str, float]
    event_recalls: Dict[str, float]
    created_at: datetime

class ThresholdSweepRequest(BaseModel):
    cost_miss: float = 50000.0
    cost_false: float = 2000.0
    inspection_cost: float = 500.0

class ReplayPoint(BaseModel):
    ts: datetime
    machine_id: str
    scores: Dict[str, float]  # model_id -> score
    actual_state: str         # normal, degraded, failure

class ReplayResponse(BaseModel):
    failure_id: str
    machine_id: str
    failure_time: datetime
    data: List[ReplayPoint]
