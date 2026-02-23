from fastapi import APIRouter

from .embeddings import router as embeddings_router
from .health import router as health_router
from .rl import router as rl_router

router = APIRouter()
router.include_router(health_router, tags=["health"])
router.include_router(embeddings_router, prefix="/embeddings", tags=["embeddings"])
router.include_router(rl_router, prefix="/rl", tags=["rl"])
