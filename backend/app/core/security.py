import datetime
from datetime import timedelta, timezone
from typing import Any, Dict, List, Optional
import bcrypt
import jwt
from fastapi import Depends, Header, Request
from app.core.config import settings
from app.core.errors import ForbiddenException, UnauthorizedException


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_token(payload: Dict[str, Any], expires_delta: timedelta) -> str:
    """Create a signed JWT token."""
    to_encode = payload.copy()
    now = datetime.datetime.now(timezone.utc)
    expire = now + expires_delta
    to_encode.update({"iat": now, "exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: str, email: str, role: str, line_ids: List[str]) -> str:
    """Create JWT access token with role and line scoping."""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "line_ids": line_ids,
        "type": "access"
    }
    return create_token(payload, timedelta(minutes=settings.JWT_ACCESS_MINUTES))


def create_refresh_token(user_id: str) -> str:
    """Create JWT refresh token."""
    payload = {
        "sub": user_id,
        "type": "refresh"
    }
    return create_token(payload, timedelta(days=settings.JWT_REFRESH_DAYS))


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedException("Session expired. Please log in again.")
    except jwt.PyJWTError:
        raise UnauthorizedException("Invalid authentication credentials.")


async def get_current_user_payload(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Dependency to retrieve and validate current user from Authorization header."""
    if not authorization:
        raise UnauthorizedException("Authorization header is missing")
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise UnauthorizedException("Invalid Authorization header format. Expected 'Bearer <token>'")
    
    payload = decode_token(parts[1])
    if payload.get("type") != "access":
        raise UnauthorizedException("Invalid token type")
        
    return payload


class RequireRole:
    """Dependency factory to enforce role-based access control."""
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: Dict[str, Any] = Depends(get_current_user_payload)) -> Dict[str, Any]:
        role = user.get("role")
        if role not in self.allowed_roles and role != "Admin":
            raise ForbiddenException(
                f"Action requires one of the following roles: {', '.join(self.allowed_roles)}. Your role is '{role}'."
            )
        return user


def verify_line_access(user: Dict[str, Any], line_id: str) -> None:
    """Scope check: Technicians may only query/act on machines/sensors in assigned lines."""
    role = user.get("role")
    if role in ["Admin", "Reliability Engineer", "Viewer"]:
        return  # Global access
    user_line_ids = user.get("line_ids", [])
    if line_id not in user_line_ids:
        raise ForbiddenException(f"You do not have permission for line '{line_id}'. Assigned lines: {user_line_ids}")
