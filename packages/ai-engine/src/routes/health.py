from fastapi import APIRouter, Depends

from ..dependencies import get_vector_store
from ..models.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version="0.1.0")


@router.get("/health/ready")
async def ready(store=Depends(get_vector_store)) -> dict:
    store.load()
    return {"ready": store.is_loaded}
