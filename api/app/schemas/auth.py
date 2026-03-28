from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool = False


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_active: bool
    is_senior: bool
    must_change_password: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreateRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "agent"


class UserUpdateRequest(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    role: str | None = None
    is_active: bool | None = None
    is_senior: bool | None = None
