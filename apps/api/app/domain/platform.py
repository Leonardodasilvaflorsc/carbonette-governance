"""Domínio da plataforma: usuários, watchlist e alertas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

Role = Literal["admin", "analyst", "viewer"]


class User(BaseModel):
    id: str
    email: EmailStr
    role: Role = "viewer"


class UserWithHash(User):
    password_hash: str


class Watch(BaseModel):
    id: str
    user_id: str
    target_type: Literal["facility", "aoi"]
    target_id: str
    gas: str = "CH4"
    last_checked: datetime | None = None


class Alert(BaseModel):
    id: str
    watch_id: str
    kind: Literal["new-plume", "anomaly"]
    message: str
    payload: dict = Field(default_factory=dict)
    sent: bool = False
    created_at: datetime
