"""Autenticação: hash de senha (scrypt, stdlib), JWT e papéis.

Papéis: admin (gestão completa), analyst (cria AOIs/análises/dossiês),
viewer (somente leitura). Links públicos usam JWTs de escopo restrito
com audiência própria ("share") — nunca dão acesso à API autenticada.
"""

import base64
import hashlib
import hmac
import os
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.domain.platform import User

settings = get_settings()

_SCRYPT = {"n": 2**14, "r": 8, "p": 1}


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)
    return f"{base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_b64, digest_b64 = stored.split("$")
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        digest = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)
        return hmac.compare_digest(digest, expected)
    except Exception:
        return False


def create_access_token(user: User, expires_hours: int = 12) -> str:
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "aud": "api",
        "exp": datetime.now(tz=UTC) + timedelta(hours=expires_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_share_token(target_type: str, target_id: str, expires_days: int = 30) -> str:
    payload = {
        "scope": target_type,
        "target": target_id,
        "aud": "share",
        "exp": datetime.now(tz=UTC) + timedelta(days=expires_days),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_share_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], audience="share")


_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="autenticação necessária")
    try:
        payload = jwt.decode(
            credentials.credentials, settings.jwt_secret, algorithms=["HS256"], audience="api"
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="token inválido ou expirado") from e
    user = await request.app.state.user_store.get(payload["sub"])
    if user is None:
        raise HTTPException(status_code=401, detail="usuário não existe mais")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: str):
    async def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail=f"requer papel: {', '.join(roles)}")
        return user

    return Depends(checker)


# escritas exigem analista ou admin; viewer é somente leitura
RequireAnalyst = require_role("admin", "analyst")
RequireAdmin = require_role("admin")
