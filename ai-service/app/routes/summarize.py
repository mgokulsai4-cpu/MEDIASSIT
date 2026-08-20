"""Report summarization endpoint (contract: backend ``/summarize``)."""
from __future__ import annotations

from fastapi import APIRouter

from ..agents.report_agent import summarize_report
from ..schemas import SummaryRequest

router = APIRouter(tags=['report'])


@router.post('/summarize')
def summarize(req: SummaryRequest) -> dict:
    return summarize_report(req.text, req.diagnosis)