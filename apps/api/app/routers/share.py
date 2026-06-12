"""Links públicos assinados (E7): cliente vê SOMENTE o alvo compartilhado.

O token é um JWT de audiência "share" com escopo {target_type, target_id}
e expiração — não dá acesso a nenhum outro recurso da API.
"""

from typing import Annotated, Literal

import jwt as pyjwt
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.security import RequireAnalyst, create_share_token, decode_share_token
from app.domain.facilities import FacilityRecord
from app.domain.plumes import Plume
from app.stores.facilities import FacilityStore
from app.stores.plumes import PlumeStore

router = APIRouter(prefix="/share", tags=["share"])


def get_facility_store(request: Request) -> FacilityStore:
    return request.app.state.facility_store


def get_plume_store(request: Request) -> PlumeStore:
    return request.app.state.plume_store


class ShareRequest(BaseModel):
    target_type: Literal["facility"]
    target_id: str
    expires_days: int = Field(30, ge=1, le=365)


class ShareCreated(BaseModel):
    token: str
    path: str


class SharedFacilityView(BaseModel):
    target_type: str
    facility: FacilityRecord
    plumes: list[Plume]


@router.post("", response_model=ShareCreated, status_code=201, dependencies=[RequireAnalyst])
async def create_share(
    body: ShareRequest,
    facilities: Annotated[FacilityStore, Depends(get_facility_store)],
):
    if await facilities.get(body.target_id) is None:
        raise HTTPException(status_code=404, detail="instalação não encontrada")
    token = create_share_token(body.target_type, body.target_id, body.expires_days)
    return ShareCreated(token=token, path=f"/share/{token}")


@router.get("/{token}", response_model=SharedFacilityView)
async def resolve_share(
    token: str,
    facilities: Annotated[FacilityStore, Depends(get_facility_store)],
    plumes: Annotated[PlumeStore, Depends(get_plume_store)],
):
    try:
        payload = decode_share_token(token)
    except pyjwt.ExpiredSignatureError as e:
        raise HTTPException(status_code=401, detail="link expirado") from e
    except pyjwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="link inválido") from e

    facility = await facilities.get(payload["target"])
    if facility is None:
        raise HTTPException(status_code=404, detail="alvo do link não existe mais")
    facility_plumes = await plumes.query(None, None, facility.id)
    return SharedFacilityView(
        target_type=payload["scope"], facility=facility, plumes=facility_plumes
    )
