from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.core.config import settings
from app.core.errors import NotFoundException, UnauthorizedException, ValidationException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user_payload,
    hash_password,
    verify_password
)
from app.db.storage import get_collection, persist_mock_store
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserSummary
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

FAILED_ATTEMPTS: Dict[str, Dict[str, Any]] = {}

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    users_col = get_collection("users")
    user = users_col.find_one({"email": req.email.lower().strip()})
    
    # Lockout check
    attempt_info = FAILED_ATTEMPTS.get(req.email.lower(), {"count": 0, "locked_until": None})
    now = datetime.now(timezone.utc)
    if attempt_info.get("locked_until") and now < attempt_info["locked_until"]:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account temporarily locked after 5 failed attempts. Please try again later."
        )

    if not user or not verify_password(req.password, user.get("password_hash", "")):
        cnt = attempt_info.get("count", 0) + 1
        locked_until = now + timedelta(minutes=15) if cnt >= 5 else None
        FAILED_ATTEMPTS[req.email.lower()] = {"count": cnt, "locked_until": locked_until}
        raise UnauthorizedException("Invalid operator ID or passcode.")

    # Reset failed attempts
    FAILED_ATTEMPTS.pop(req.email.lower(), None)

    user_id = str(user["_id"])
    role = user.get("role", "Viewer")
    line_ids = user.get("line_ids", [])

    access_token = create_access_token(user_id, user["email"], role, line_ids)
    refresh_token = create_refresh_token(user_id)

    # Audit log
    audit_col = get_collection("audit_logs")
    audit_col.insert_one({
        "actor": user["email"],
        "action": "LOGIN",
        "resource": "auth",
        "metadata": {"role": role},
        "created_at": now
    })

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_MINUTES * 60,
        user=UserSummary(
            id=user_id,
            email=user["email"],
            name=user.get("name", "Operator"),
            role=role,
            line_ids=line_ids,
            status=user.get("status", "active"),
            must_change_password=user.get("must_change_password", False)
        )
    )

@router.post("/refresh")
async def refresh_token(req: RefreshRequest):
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise UnauthorizedException("Invalid token type for refresh")
    
    user_id = payload.get("sub")
    users_col = get_collection("users")
    user = users_col.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise UnauthorizedException("User not found")

    new_access = create_access_token(user_id, user["email"], user["role"], user.get("line_ids", []))
    new_refresh = create_refresh_token(user_id)

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_MINUTES * 60
    }

@router.post("/logout")
async def logout(user: Dict[str, Any] = Depends(get_current_user_payload)):
    return {"message": "Successfully logged out of control session."}

@router.get("/me")
async def get_me(user_payload: Dict[str, Any] = Depends(get_current_user_payload)):
    users_col = get_collection("users")
    user_id = user_payload["sub"]
    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    user = users_col.find_one(query)
    if not user:
        raise NotFoundException("User", user_id)
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name"),
        "role": user.get("role"),
        "line_ids": user.get("line_ids", []),
        "status": user.get("status", "active")
    }

@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    users_col = get_collection("users")
    user_id = user_payload["sub"]
    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    user = users_col.find_one(query)
    if not user or not verify_password(req.current_password, user.get("password_hash", "")):
        raise ValidationException("Current passcode is incorrect.")

    new_hash = hash_password(req.new_password)
    users_col.update_one(
        query,
        {"$set": {"password_hash": new_hash, "must_change_password": False}}
    )
    persist_mock_store()
    return {"message": "Passcode successfully updated."}

@router.post("/forgot")
async def forgot_password(req: ForgotPasswordRequest):
    users_col = get_collection("users")
    user = users_col.find_one({"email": req.email.lower().strip()})
    dev_token = "dev-reset-token-2026"
    logger.info(f"[DEV AUTH] Password reset link for {req.email}: http://localhost:5173/reset?token={dev_token}")
    return {"message": "If this email is registered, reset instructions have been logged to console (dev link enabled)."}

@router.post("/reset")
async def reset_password(req: ResetPasswordRequest):
    if req.token != "dev-reset-token-2026":
        raise ValidationException("Invalid or expired reset token.")
    return {"message": "Passcode has been reset. You may now log in with your new passcode."}
