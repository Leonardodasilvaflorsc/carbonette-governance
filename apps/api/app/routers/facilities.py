from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from app.domain.facilities import Bbox, FacilityRecord, parse_bbox
from app.stores.facilities import FacilityStore

router = APIRouter(prefix="/facilities", tags=["facilities"])


def get_store(request: Request) -> FacilityStore:
    return request.app.state.facility_store


StoreDep = Annotated[FacilityStore, Depends(get_store)]


def parse_bbox_param(bbox: str | None) -> Bbox | None:
    if bbox is None:
        return None
    try:
        return parse_bbox(bbox)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


class FacilityListResponse(BaseModel):
    source: str  # db | mock — "mock" nunca deve aparecer em produção
    count: int
    facilities: list[FacilityRecord]


class SectorsResponse(BaseModel):
    sectors: list[str]


@router.get("", response_model=FacilityListResponse)
async def list_facilities(
    store: StoreDep,
    bbox: str | None = Query(None, description="west,south,east,north (EPSG:4326)"),
    sector: str | None = None,
    min_co2e_t: float | None = Query(None, ge=0),
    limit: int = Query(2000, ge=1, le=10000),
):
    box = parse_bbox_param(bbox)
    records = await store.query(box, sector, min_co2e_t, limit)
    return FacilityListResponse(source=store.source, count=len(records), facilities=records)


@router.get("/ranking", response_model=FacilityListResponse)
async def ranking(
    store: StoreDep,
    bbox: str | None = Query(None, description="west,south,east,north (EPSG:4326)"),
    sector: str | None = None,
    limit: int = Query(20, ge=1, le=100),
):
    """Top emissores (t CO₂e/ano, GWP100) da viewport/filtros atuais."""
    box = parse_bbox_param(bbox)
    records = await store.query(box, sector, None, limit)
    return FacilityListResponse(source=store.source, count=len(records), facilities=records)


@router.get("/sectors", response_model=SectorsResponse)
async def sectors(store: StoreDep):
    return SectorsResponse(sectors=await store.sectors())


@router.get("/{facility_id}", response_model=FacilityRecord)
async def get_facility(facility_id: str, store: StoreDep):
    record = await store.get(facility_id)
    if record is None:
        raise HTTPException(status_code=404, detail="instalação não encontrada")
    return record
