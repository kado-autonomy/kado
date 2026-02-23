from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = "0.0.0.0"
    port: int = 8100
    debug: bool = False
    embedding_model: str = "all-MiniLM-L6-v2"
    vector_dimensions: int = 384
    faiss_index_path: str = "./data/faiss_index"
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
