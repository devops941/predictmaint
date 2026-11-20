from typing import List, Optional
from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserSummary"

class RefreshRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3)

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class UserCreate(BaseModel):
    email: str = Field(..., min_length=3)
    name: str = Field(..., min_length=2)
    role: str = Field(..., description="Admin, Reliability Engineer, Technician, Viewer")
    line_ids: List[str] = Field(default_factory=list)
    password: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    line_ids: Optional[List[str]] = None
    status: Optional[str] = None

class UserSummary(BaseModel):
    id: str
    email: str
    name: str
    role: str
    line_ids: List[str]
    status: str
    must_change_password: bool = False

TokenResponse.model_rebuild()
