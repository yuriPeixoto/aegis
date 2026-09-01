from __future__ import annotations

from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.models.training_record import TrainingRecord
from app.services.training_record_service import TrainingRecordService

_TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)

_MODALITY_LABELS = {"presencial": "Presencial", "remoto": "Remoto"}
_TRAINING_TYPE_LABELS = {
    "inicial": "Inicial",
    "reciclagem": "Reciclagem",
    "atualizacao": "Atualização",
    "nova_funcionalidade": "Nova funcionalidade",
}


class TrainingPdfService:
    def __init__(self, record_service: TrainingRecordService) -> None:
        self._records = record_service

    def render(self, record: TrainingRecord) -> bytes:
        participants = [
            {
                "name": p.name,
                "role_title": p.role_title,
                "sector": p.sector,
                "signature_b64": self._records.read_signature_base64(p.signature_path),
            }
            for p in record.participants
        ]
        record_ctx = {
            "id": record.id,
            "training_name": record.training_name,
            "system_module": record.system_module,
            "version": record.version,
            "training_date": record.training_date.strftime("%d/%m/%Y"),
            "start_time": record.start_time,
            "end_time": record.end_time,
            "workload_hours": record.workload_hours,
            "area_sector": record.area_sector,
            "instructor": {"name": record.instructor.name},
            "instructor_title": record.instructor_title,
            "modules": record.modules_json,
            "evaluation_method": record.evaluation_method,
            "performance_notes": record.performance_notes,
            "general_notes": record.general_notes,
            "status": record.status,
            "participants": participants,
            "responsible_name": record.responsible_name,
        }
        template = _env.get_template("training_record.html")
        html_str = template.render(
            record=record_ctx,
            generated_at=datetime.now().strftime("%d/%m/%Y %H:%M"),
            modality_label=_MODALITY_LABELS.get(record.modality, record.modality),
            training_type_label=_TRAINING_TYPE_LABELS.get(
                record.training_type, record.training_type
            ),
            source_name=record.source.name if record.source else None,
            instructor_signature_b64=self._records.read_signature_base64(
                record.instructor_signature_path
            ),
            responsible_signature_b64=self._records.read_signature_base64(
                record.responsible_signature_path
            ),
        )
        pdf_bytes: bytes = HTML(string=html_str).write_pdf()
        return pdf_bytes
