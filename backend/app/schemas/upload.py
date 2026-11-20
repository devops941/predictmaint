from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class ScanIssue(BaseModel):
    id: str
    row_idx: int
    column: str
    issue_type: str  # gap, duplicate, flatline, spike, unit_mismatch, clock_drift, invalid_format
    severity: str    # warn, fail
    description: str
    proposed_fix: Optional[str] = None
    applied: bool = False

class ScanRequest(BaseModel):
    kind: str = Field(..., description="readings or maintenance")
    filename: str
    column_mapping: Dict[str, str] = Field(default_factory=dict)
    units: Dict[str, str] = Field(default_factory=dict)
    duplicate_policy: str = "skip"  # skip, replace, reject

class ScanSummaryResponse(BaseModel):
    batch_id: str
    total_rows: int
    valid_rows: int
    warn_rows: int
    fail_rows: int
    issues: List[ScanIssue]
    preview_rows: List[Dict[str, Any]]
    status: str  # scanned, fixed, ready, rejected

class ApplyFixesRequest(BaseModel):
    fix_ids: List[str]
    duplicate_policy: Optional[str] = None

class ReleaseResponse(BaseModel):
    batch_id: str
    released_rows: int
    rejected_rows: int
    status: str
    message: str
