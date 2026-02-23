from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_embedding_service, get_vector_store
from ..models.schemas import (
    EmbeddingRequest,
    EmbeddingResponse,
    QueryRequest,
    QueryResponse,
    QueryResult,
    UpsertRequest,
)

router = APIRouter()


@router.post("/encode", response_model=EmbeddingResponse)
async def encode(
    request: EmbeddingRequest,
    service=Depends(get_embedding_service),
) -> EmbeddingResponse:
    embeddings = service.encode(request.texts)
    return EmbeddingResponse(
        embeddings=[emb.tolist() for emb in embeddings]
    )


@router.post("/upsert")
async def upsert(
    request: UpsertRequest,
    service=Depends(get_embedding_service),
    store=Depends(get_vector_store),
) -> dict:
    store.load()
    embedding = service.encode([request.text])[0]
    store.upsert(request.id, embedding, request.metadata)
    store.save()
    return {"ok": True}


@router.post("/query", response_model=QueryResponse)
async def query(
    request: QueryRequest,
    service=Depends(get_embedding_service),
    store=Depends(get_vector_store),
) -> QueryResponse:
    store.load()
    embedding = service.encode([request.text])[0]
    results = store.query(embedding, request.top_k)
    return QueryResponse(
        results=[
            QueryResult(id=doc_id, score=score, metadata=meta)
            for doc_id, score, meta in results
        ]
    )


@router.delete("/{id}")
async def delete_embedding(
    id: str,
    store=Depends(get_vector_store),
) -> dict:
    store.load()
    if not store.delete(id):
        raise HTTPException(status_code=404, detail="Not found")
    store.save()
    return {"ok": True}
