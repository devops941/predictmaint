from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: str
    actor: str
    action: str
    resource: str
    metadata: Dict[str, Any]
    created_at: datetime
