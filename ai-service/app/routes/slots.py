"""Slot recommendation endpoint."""
from __future__ import annotations

from fastapi import APIRouter

from ..agents.slot_agent import recommend_slots
from ..schemas import SlotRecommendRequest

router = APIRouter(tags=['slots'])


@router.post('/ai/recommend-slots')
def recommend(req: SlotRecommendRequest) -> dict:
    results = recommend_slots(
        available_slots=req.available_slots,
        urgency=req.urgency,
        recommended_specialties=req.recommended_specialties,
    )
    return {'recommendations': results}
