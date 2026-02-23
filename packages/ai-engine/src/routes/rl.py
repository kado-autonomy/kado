from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_rl_service
from ..services.rl_service import RLService

router = APIRouter()


@router.post("/log-action")
async def log_action(
    body: dict,
    service: RLService = Depends(get_rl_service),
) -> dict:
    action = body.get("action", "")
    context = body.get("context", {})
    result = body.get("result", {})
    if not action:
        raise HTTPException(status_code=400, detail="action is required")
    action_id = service.log_action(action, context, result)
    return {"action_id": action_id}


@router.post("/feedback")
async def record_feedback(
    body: dict,
    service: RLService = Depends(get_rl_service),
) -> dict:
    action_id = body.get("action_id")
    accepted = body.get("accepted")
    if not action_id:
        raise HTTPException(status_code=400, detail="action_id is required")
    if accepted is None:
        raise HTTPException(status_code=400, detail="accepted is required")
    service.record_feedback(action_id, bool(accepted))
    return {"ok": True}


@router.get("/stats")
async def get_stats(
    service: RLService = Depends(get_rl_service),
) -> dict:
    return service.get_stats()


@router.post("/optimize")
async def optimize(
    service: RLService = Depends(get_rl_service),
) -> dict:
    return service.optimize()


@router.post("/recommend")
async def recommend(
    body: dict,
    service: RLService = Depends(get_rl_service),
) -> dict:
    context = body.get("context", "")
    if not context:
        raise HTTPException(status_code=400, detail="context is required")
    recommendations = service.recommend(context)
    return {"context": context, "recommendations": recommendations}
