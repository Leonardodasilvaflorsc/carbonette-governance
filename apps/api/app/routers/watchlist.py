import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.core.security import CurrentUser, RequireAdmin
from app.domain.platform import Alert, Watch

router = APIRouter(tags=["watchlist"])


class WatchRequest(BaseModel):
    target_type: Literal["facility", "aoi"]
    target_id: str
    gas: str = "CH4"


@router.post("/watchlist", response_model=Watch, status_code=201)
async def create_watch(body: WatchRequest, user: CurrentUser, request: Request):
    if user.role == "viewer":
        raise HTTPException(status_code=403, detail="viewer é somente leitura")
    if body.target_type == "facility":
        if await request.app.state.facility_store.get(body.target_id) is None:
            raise HTTPException(status_code=404, detail="instalação não encontrada")
    elif await request.app.state.analysis_service.store.get_aoi(body.target_id) is None:
        raise HTTPException(status_code=404, detail="AOI não encontrada")

    watch = Watch(
        id=f"wch-{uuid.uuid4().hex[:10]}",
        user_id=user.id,
        target_type=body.target_type,
        target_id=body.target_id,
        gas=body.gas,
    )
    await request.app.state.platform_store.create_watch(watch)
    return watch


@router.get("/watchlist", response_model=list[Watch])
async def list_watches(user: CurrentUser, request: Request):
    return await request.app.state.platform_store.list_for_user(user.id)


@router.get("/alerts", response_model=list[Alert])
async def list_alerts(user: CurrentUser, request: Request):
    return await request.app.state.platform_store.list_alerts_for_user(user.id)


@router.post("/watchlist/check", dependencies=[RequireAdmin])
async def run_check(request: Request):
    """Disparo manual da verificação (a periódica roda via Celery beat)."""
    created = await request.app.state.watch_checker.check_all()
    return {"alerts_created": created}
