from typing import TYPE_CHECKING

from fastapi import Request

if TYPE_CHECKING:
    from .services.embedding_service import EmbeddingService
    from .services.vector_store import VectorStore
    from .services.rl_service import RLService


def get_embedding_service(request: Request) -> "EmbeddingService":
    return request.app.state.embedding_service


def get_vector_store(request: Request) -> "VectorStore":
    return request.app.state.vector_store


def get_rl_service(request: Request) -> "RLService":
    return request.app.state.rl_service
