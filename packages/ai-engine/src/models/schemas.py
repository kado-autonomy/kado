from pydantic import BaseModel, Field


class EmbeddingRequest(BaseModel):
    texts: list[str]


class EmbeddingResponse(BaseModel):
    embeddings: list[list[float]]


class UpsertRequest(BaseModel):
    id: str
    text: str
    metadata: dict = Field(default_factory=dict)


class QueryRequest(BaseModel):
    text: str
    top_k: int = 10


class QueryResult(BaseModel):
    id: str
    score: float
    metadata: dict


class QueryResponse(BaseModel):
    results: list[QueryResult]


class HealthResponse(BaseModel):
    status: str
    version: str
