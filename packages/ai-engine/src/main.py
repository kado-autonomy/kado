import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes import router
from .services.embedding_service import EmbeddingService
from .services.vector_store import VectorStore
from .services.rl_service import RLService


def create_app(
    embedding_service=None,
    vector_store=None,
    rl_service=None,
) -> FastAPI:
    app = FastAPI(title="Kado AI Engine", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start
        logging.info(
            "%s %s %s %.3fs",
            request.method,
            request.url.path,
            response.status_code,
            duration,
        )
        return response

    app.include_router(router)

    @app.on_event("startup")
    async def startup() -> None:
        settings = get_settings()
        logging.basicConfig(level=getattr(logging, settings.log_level.upper()))
        app.state.embedding_service = (
            embedding_service
            if embedding_service is not None
            else EmbeddingService(settings.embedding_model)
        )
        app.state.vector_store = (
            vector_store
            if vector_store is not None
            else VectorStore(
                settings.vector_dimensions,
                settings.faiss_index_path,
            )
        )
        app.state.vector_store.load()
        app.state.rl_service = (
            rl_service if rl_service is not None else RLService()
        )

    @app.on_event("shutdown")
    async def shutdown() -> None:
        if hasattr(app.state, "vector_store"):
            app.state.vector_store.save()

    return app


app = create_app()
