from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class ModelCreateRequest(BaseModel):
    name: str
    family: str  # baseline_rule, control_chart, isolation_forest, pca_mahalanobis, logistic_regression, random_forest, hist_gradient_boosting
    feature_set_id: str
    horizon_hours: int = 72
    params: Dict[str, Any] = Field(default_factory=dict)
    use_class_weights: bool = True

class ModelResponse(BaseModel):
    id: str
    name: str
    family: str
    feature_set_id: str
    trained_range: str
    metrics: Dict[str, float] = Field(default_factory=dict)
    threshold: float = 0.5
    status: str = "draft"  # draft, validated, active, retired
    approved_by: Optional[str] = None
    approval_note: Optional[str] = None
    created_at: datetime
    version: str = "pm-v1"

class ModelActivateRequest(BaseModel):
    approval_note: str = Field(..., min_length=5)
