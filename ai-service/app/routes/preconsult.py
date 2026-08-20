"""Pre-consultation interview endpoint."""
from __future__ import annotations

from fastapi import APIRouter

from ..agents.preconsult_agent import next_turn
from ..schemas import PreConsultRequest

router = APIRouter(tags=['preconsult'])


@router.post('/ai/preconsult')
def preconsult(req: PreConsultRequest) -> dict:
    patient = req.patient_context.model_dump() if req.patient_context else None
    return next_turn(
        messages=[{'role': m.role, 'text': m.text} for m in req.messages],
        answers=[{'key': a.key, 'answer': a.answer, 'rephrased': a.rephrased} for a in req.answers],
        triage_context=req.triage_context,
        patient_context=patient,
    )
