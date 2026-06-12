from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.reports.builder import Branding, build_dossier_html, render_pdf
from app.stores.facilities import FacilityStore
from app.stores.plumes import PlumeStore
from app.stores.reports import ReportMeta, ReportStore

router = APIRouter(tags=["reports"])
settings = get_settings()


def get_report_store(request: Request) -> ReportStore:
    return request.app.state.report_store


def get_facility_store(request: Request) -> FacilityStore:
    return request.app.state.facility_store


def get_plume_store(request: Request) -> PlumeStore:
    return request.app.state.plume_store


ReportStoreDep = Annotated[ReportStore, Depends(get_report_store)]
FacilityStoreDep = Annotated[FacilityStore, Depends(get_facility_store)]
PlumeStoreDep = Annotated[PlumeStore, Depends(get_plume_store)]


class ReportRequest(BaseModel):
    carbon_price_eur_t: float | None = Field(None, gt=0)
    export_fraction_eu: float = Field(0.2, ge=0, le=1)


class ReportCreated(BaseModel):
    report_id: str
    trace_hash: str
    url: str


@router.post("/facilities/{facility_id}/report", response_model=ReportCreated, status_code=201)
async def generate_report(
    facility_id: str,
    body: ReportRequest,
    reports: ReportStoreDep,
    facilities: FacilityStoreDep,
    plumes: PlumeStoreDep,
):
    facility = await facilities.get(facility_id)
    if facility is None:
        raise HTTPException(status_code=404, detail="instalação não encontrada")

    facility_plumes = await plumes.query(None, None, facility_id)
    peers = [
        p
        for p in await facilities.query(None, facility.sector, None, 10000)
        if p.country == facility.country
    ]

    price = body.carbon_price_eur_t or settings.carbon_price_eur_t
    html, report_id, trace_hash = build_dossier_html(
        facility=facility,
        plumes=facility_plumes,
        sector_peers=peers,
        branding=Branding(settings.app_name, settings.brand_primary_color),
        carbon_price_eur_t=price,
        export_fraction_eu=body.export_fraction_eu,
    )
    pdf = render_pdf(html)
    await reports.save(
        ReportMeta(
            id=report_id,
            facility_id=facility_id,
            trace_hash=trace_hash,
            params={"carbon_price_eur_t": price, "export_fraction_eu": body.export_fraction_eu},
        ),
        pdf,
    )
    return ReportCreated(
        report_id=report_id, trace_hash=trace_hash, url=f"/reports/{report_id}.pdf"
    )


@router.get("/reports/{report_id}.pdf")
async def get_report_pdf(report_id: str, reports: ReportStoreDep):
    pdf = await reports.get_pdf(report_id)
    if pdf is None:
        raise HTTPException(status_code=404, detail="dossiê não encontrado")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{report_id}.pdf"'},
    )
