"""Chat and triage endpoints (contract: backend ``aiClient.ts``)."""
from __future__ import annotations

from fastapi import APIRouter

from ..agents.triage_agent import next_chat_turn
from ..schemas import ChatRequest

router = APIRouter(prefix='/ai', tags=['ai'])


def _run_turn(req: ChatRequest) -> dict:
    patient = req.patient_context.model_dump() if req.patient_context else None
    return next_chat_turn(
        messages=[{'role': m.role, 'text': m.text} for m in req.messages],
        answers=[{'key': a.key, 'answer': a.answer, 'rephrased': a.rephrased} for a in req.answers],
        patient=patient,
        simple=req.simple,
    )


@router.post('/chat')
def chat(req: ChatRequest) -> dict:
    """Adaptive triage conversation: next question or final result."""
    return _run_turn(req)


@router.post('/triage')
def triage(req: ChatRequest) -> dict:
    """One-shot triage for a provided message/answer history."""
    return _run_turn(req)