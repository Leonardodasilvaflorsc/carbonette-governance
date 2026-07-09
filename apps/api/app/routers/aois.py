import csv
import io
import statistics
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel

from app.core.security import RequireAnalyst
from app.domain.analysis import AnalysisGas, AnalysisJob, AnalysisParams, Aoi, GeoPolygon
from app.providers.emissions_data import provider_product_label
from app.services.analysis import AnalysisService

router = APIRouter(tags=["analysis"])


def get_service(request: Request) -> AnalysisService:
    return request.app.state.analysis_service


def get_runner(request: Request):
    return request.app.state.analysis_runner


ServiceDep = Annotated[AnalysisService, Depends(get_service)]


class CreateAoiRequest(BaseModel):
    name: str
    geometry: GeoPolygon


class JobSubmitted(BaseModel):
    job: AnalysisJob
    runner: str


@router.post("/aois", response_model=Aoi, status_code=201, dependencies=[RequireAnalyst])
async def create_aoi(body: CreateAoiRequest, service: ServiceDep):
    ring = body.geometry.coordinates[0] if body.geometry.coordinates else []
    if len(ring) < 4:
        raise HTTPException(status_code=422, detail="polígono precisa de ao menos 3 vértices")
    return await service.create_aoi(body.name, body.geometry)


@router.get("/aois", response_model=list[Aoi])
async def list_aois(service: ServiceDep):
    return await service.store.list_aois()


@router.post(
    "/aois/{aoi_id}/analyses",
    response_model=JobSubmitted,
    status_code=202,
    dependencies=[RequireAnalyst],
)
async def submit_analysis(
    aoi_id: str, params: AnalysisParams, service: ServiceDep, request: Request
):
    if params.start >= params.end:
        raise HTTPException(status_code=422, detail="período inválido (start >= end)")
    if await service.store.get_aoi(aoi_id) is None:
        raise HTTPException(status_code=404, detail="AOI não encontrada")
    job = await service.create_job(aoi_id, params)
    runner = get_runner(request)
    runner.submit(job.id)
    return JobSubmitted(job=job, runner=runner.name)


class BeforeAfterResponse(BaseModel):
    """Comparação antes/depois de um marco (ex.: projeto de redução)."""

    gas: str
    pivot: date
    months_window: int
    before_mean: float | None
    after_mean: float | None
    change_pct: float | None
    n_before: int
    n_after: int
    unit: str
    product: str


@router.get("/aois/{aoi_id}/before-after", response_model=BeforeAfterResponse)
async def before_after(
    aoi_id: str,
    service: ServiceDep,
    pivot: Annotated[date, Query(description="data do marco (ex.: comissionamento)")],
    gas: AnalysisGas = "CH4",
    months: Annotated[int, Query(ge=2, le=24)] = 6,
):
    """Prova de redução pós-projeto: média de concentração antes vs. depois."""
    aoi = await service.store.get_aoi(aoi_id)
    if aoi is None:
        raise HTTPException(status_code=404, detail="AOI não encontrada")

    start = pivot - timedelta(days=31 * months)
    end = pivot + timedelta(days=31 * months)
    series = await service.provider.extract_timeseries(aoi.geometry, gas, start, end)

    before = [p.value for p in series if p.value is not None and p.date < pivot]
    after = [p.value for p in series if p.value is not None and p.date >= pivot]
    before_mean = statistics.fmean(before) if before else None
    after_mean = statistics.fmean(after) if after else None
    change = (
        round(100 * (after_mean - before_mean) / before_mean, 1)
        if before_mean and after_mean is not None
        else None
    )
    return BeforeAfterResponse(
        gas=gas,
        pivot=pivot,
        months_window=months,
        before_mean=round(before_mean, 2) if before_mean is not None else None,
        after_mean=round(after_mean, 2) if after_mean is not None else None,
        change_pct=change,
        n_before=len(before),
        n_after=len(after),
        unit=series[0].unit if series else "",
        product=provider_product_label(service.provider, gas),
    )


@router.get("/analyses/{job_id}", response_model=AnalysisJob)
async def get_analysis(job_id: str, service: ServiceDep):
    job = await service.store.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job não encontrado")
    return job


async def _done_job(job_id: str, service: AnalysisService) -> AnalysisJob:
    job = await service.store.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job não encontrado")
    if job.status != "done":
        raise HTTPException(status_code=409, detail=f"job em estado '{job.status}'")
    return job


@router.get("/analyses/{job_id}/export.csv")
async def export_csv(job_id: str, service: ServiceDep):
    job = await _done_job(job_id, service)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["# produto", job.product])
    writer.writerow(
        ["date", "value", "unit", "qa_fraction", "n_obs", "background",
         "climatology", "zscore", "anomaly"]
    )
    for p in job.result:
        writer.writerow(
            [p.date.isoformat(), p.value, p.unit, p.qa_fraction, p.n_obs,
             p.background, p.climatology, p.zscore, p.anomaly]
        )
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={job_id}.csv"},
    )


@router.get("/analyses/{job_id}/export.geojson")
async def export_geojson(job_id: str, service: ServiceDep):
    job = await _done_job(job_id, service)
    aoi = await service.store.get_aoi(job.aoi_id)
    feature = {
        "type": "Feature",
        "geometry": aoi.geometry.model_dump() if aoi else None,
        "properties": {
            "aoi_id": job.aoi_id,
            "aoi_name": aoi.name if aoi else None,
            "gas": job.params.gas,
            "product": job.product,
            "series": [p.model_dump(mode="json") for p in job.result],
        },
    }
    return {"type": "FeatureCollection", "features": [feature]}
