"""Verificação periódica de watchlists e envio de alertas (E6).

Gatilhos:
- facility: nova pluma detectada desde a última verificação;
- aoi: ponto mais recente da análise dos últimos 12 meses flaggado como
  anomalia (z ≥ 2 sobre a climatologia móvel).

Roda via Celery beat (diário) ou manualmente por POST /watchlist/check.
"""

import logging
import smtplib
import uuid
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage
from typing import Protocol

from app.domain.analysis import AnalysisParams
from app.domain.platform import Alert, Watch

logger = logging.getLogger(__name__)


class EmailSender(Protocol):
    def send(self, to: str, subject: str, body: str) -> None: ...


class SmtpEmailSender:
    def __init__(self, host: str, port: int, user: str, password: str, sender: str):
        self.host, self.port, self.user, self.password, self.sender = (
            host, port, user, password, sender,
        )

    def send(self, to, subject, body):
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = self.sender, to, subject
        msg.set_content(body)
        with smtplib.SMTP(self.host, self.port) as smtp:
            smtp.starttls()
            if self.user:
                smtp.login(self.user, self.password)
            smtp.send_message(msg)


class LogEmailSender:
    """Sem SMTP configurado: registra no log (dev) — alerta não se perde
    silenciosamente, fica em /alerts de qualquer forma."""

    def send(self, to, subject, body):
        logger.info("[email não enviado — SMTP ausente] para=%s assunto=%s", to, subject)


class WatchChecker:
    def __init__(self, platform_store, plume_store, analysis_service, email_sender: EmailSender):
        self.platform = platform_store
        self.plumes = plume_store
        self.analysis = analysis_service
        self.email = email_sender

    async def check_watch(self, watch: Watch) -> list[Alert]:
        alerts: list[Alert] = []
        now = datetime.now(tz=UTC)
        since = watch.last_checked or (now - timedelta(days=30))

        if watch.target_type == "facility":
            plumes = await self.plumes.query(None, None, watch.target_id)
            new = [p for p in plumes if p.observed_at > since]
            for p in new:
                flux = (
                    f"{p.flux_kg_h:,.0f} ± {p.flux_uncertainty_kg_h or 0:,.0f} kg/h"
                    if p.flux_kg_h is not None
                    else "fluxo não quantificado"
                )
                alerts.append(self._alert(watch, "new-plume",
                    f"Nova pluma de {p.gas} em {watch.target_id}: {flux} "
                    f"({p.observed_at.date().isoformat()}, {p.instrument or 'n/d'})",
                    {"plume_id": p.id}))
        else:  # aoi
            end = now.date().replace(day=1)
            params = AnalysisParams(
                gas=watch.gas, start=end - timedelta(days=365), end=end
            )
            job = await self.analysis.create_job(watch.target_id, params)
            job = await self.analysis.run_job(job.id)
            if job.status == "done" and job.result and job.result[-1].anomaly:
                last = job.result[-1]
                alerts.append(self._alert(watch, "anomaly",
                    f"Anomalia de {watch.gas} na AOI {watch.target_id}: "
                    f"{last.value} {last.unit} (z={last.zscore:.1f}) em {last.date.isoformat()}",
                    {"job_id": job.id, "zscore": last.zscore}))

        for alert in alerts:
            await self.platform.create_alert(alert)
            user = await self.platform.get(watch.user_id)
            if user:
                self.email.send(user.email, f"[ORBITAL-GHG] {alert.kind}", alert.message)
        await self.platform.update_last_checked(watch.id, now)
        return alerts

    async def check_all(self) -> int:
        total = 0
        for watch in await self.platform.list_all():
            try:
                total += len(await self.check_watch(watch))
            except Exception:
                logger.exception("falha ao verificar watch %s", watch.id)
        return total

    @staticmethod
    def _alert(watch: Watch, kind: str, message: str, payload: dict) -> Alert:
        return Alert(
            id=f"alr-{uuid.uuid4().hex[:10]}",
            watch_id=watch.id,
            kind=kind,  # type: ignore[arg-type]
            message=message,
            payload=payload,
            created_at=datetime.now(tz=UTC),
        )
