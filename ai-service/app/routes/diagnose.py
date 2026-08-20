"""Doctor diagnostic assistance endpoint."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..agents.diagnosis_agent import assist_diagnosis

router = APIRouter(tags=['diagnosis'])


class DiagnoseRequest(BaseModel):
    patient: dict = Field(default_factory=dict)
    preconsult_summary: dict = Field(default_factory=dict)
    notes: list[dict] = Field(default_factory=list)
    reason: str = ''
    urgency: str = ''


@router.post('/ai/diagnose')
def diagnose(req: DiagnoseRequest) -> dict:
    return assist_diagnosis(req.model_dump())
