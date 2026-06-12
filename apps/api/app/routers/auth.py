import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

from app.core.security import (
    CurrentUser,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.domain.platform import Role, User, UserWithHash

router = APIRouter(prefix="/auth", tags=["auth"])

_bearer = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: Role = "viewer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User


@router.post("/register", response_model=User, status_code=201)
async def register(
    body: RegisterRequest,
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
):
    """Primeiro usuário do sistema vira admin (bootstrap); depois disso,
    somente admins criam usuários."""
    store = request.app.state.user_store
    if await store.count() == 0:
        role: Role = "admin"
    else:
        current = await get_current_user(request, credentials)
        if current.role != "admin":
            raise HTTPException(status_code=403, detail="somente admin cria usuários")
        role = body.role

    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="senha precisa de 8+ caracteres")
    user = UserWithHash(
        id=f"usr-{uuid.uuid4().hex[:10]}",
        email=body.email,
        role=role,
        password_hash=hash_password(body.password),
    )
    try:
        await store.create(user)
    except Exception as e:
        raise HTTPException(status_code=409, detail="e-mail já cadastrado") from e
    return User(id=user.id, email=user.email, role=user.role)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request):
    store = request.app.state.user_store
    user = await store.get_by_email(body.email)
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="credenciais inválidas")
    public = User(id=user.id, email=user.email, role=user.role)
    return TokenResponse(access_token=create_access_token(public), user=public)


@router.get("/me", response_model=User)
async def me(user: CurrentUser):
    return user
