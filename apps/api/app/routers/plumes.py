from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.analysis.flux import csf_flux, ime_flux
from app.domain.plumes import Plume, Wind
from app.providers.wind import WindProvider
from app.routers.facilities import parse_bbox_param
from app.stores.plumes import PlumeStore

router = APIRouter(tags=["plumes"])


def get_plume_store(request: Request) -> PlumeStore:
    return request.app.state.plume_store


def get_wind_provider(request: Request) -> WindProvider:
    return request.app.state.wind_provider


PlumeStoreDep = Annotated[PlumeStore, Depends(get_plume_store)]
WindDep = Annotated[WindProvider, Depends(get_wind_provider)]


class PlumeListResponse(BaseModel):
    source: str
    count: int
    plumes: list[Plume]


@router.get("/plumes", response_model=PlumeListResponse)
async def list_plumes(
    store: PlumeStoreDep,
    bbox: str | None = Query(None, description="west,south,east,north (EPSG:4326)"),
    gas: str | None = None,
    facility_id: str | None = None,
):
    box = parse_bbox_param(bbox)
    plumes = await store.query(box, gas, facility_id)
    return PlumeListResponse(source=store.source, count=len(plumes), plumes=plumes)


@router.get("/facilities/{facility_id}/plumes", response_model=PlumeListResponse)
async def facility_plumes(facility_id: str, store: PlumeStoreDep):
    plumes = await store.query(None, None, facility_id)
    return PlumeListResponse(source=store.source, count=len(plumes), plumes=plumes)


class FluxEstimateRequest(BaseModel):
    """Estimativa de fluxo própria para enhancements TROPOMI.

    `enhancements_kg_m2`: máscara da pluma (IME) ou transecto perpendicular
    ao vento (CSF), em kg/m² acima do fundo regional.
    """

    method: Literal["IME", "CSF"]
    enhancements_kg_m2: list[float] = Field(min_length=1)
    pixel_size_m: float = Field(gt=0, description="lado do pixel (ex.: 7000 p/ TROPOMI CH4)")
    lon: float
    lat: float
    observed_at: datetime


class FluxEstimateResponse(BaseModel):
    flux_kg_h: float
    uncertainty_kg_h: float  # 1σ — nunca publicar sem isto
    method: str
    wind: Wind
    detail: str
    disclaimer: str = (
        "Estimativa de sensoriamento remoto com premissas simplificadas "
        "(vento uniforme, fundo homogêneo). Não substitui medição direta."
    )


@router.post("/flux/estimate", response_model=FluxEstimateResponse)
async def estimate_flux(body: FluxEstimateRequest, wind_provider: WindDep):
    wind = await wind_provider.wind_at(body.lon, body.lat, body.observed_at)
    try:
        if body.method == "IME":
            est = ime_flux(body.enhancements_kg_m2, body.pixel_size_m**2, wind)
        else:
            est = csf_flux(body.enhancements_kg_m2, body.pixel_size_m, wind)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return FluxEstimateResponse(
        flux_kg_h=est.flux_kg_h,
        uncertainty_kg_h=est.uncertainty_kg_h,
        method=est.method,
        wind=wind,
        detail=est.detail,
    )
