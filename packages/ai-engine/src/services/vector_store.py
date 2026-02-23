from pathlib import Path
from typing import Any

import faiss
import numpy as np


class VectorStore:
    def __init__(self, dimension: int, index_path: str = "./data/faiss_index") -> None:
        self._dimension = dimension
        self._index_path = Path(index_path)
        self._index: faiss.IndexIDMap2 | None = None
        self._id_to_index: dict[str, int] = {}
        self._index_to_id: dict[int, str] = {}
        self._metadata: dict[int, dict[str, Any]] = {}
        self._next_index = 0

    def initialize(self) -> None:
        self._index = faiss.IndexIDMap2(faiss.IndexFlatL2(self._dimension))
        self._id_to_index.clear()
        self._index_to_id.clear()
        self._metadata.clear()
        self._next_index = 0

    def load(self) -> bool:
        index_file = self._index_path / "index.faiss"
        meta_file = self._index_path / "metadata.npz"

        if not index_file.exists():
            self.initialize()
            return False

        self._index = faiss.read_index(str(index_file))

        if meta_file.exists():
            data = np.load(meta_file, allow_pickle=True)
            self._id_to_index = dict(data["id_to_index"].item())
            self._index_to_id = {v: k for k, v in self._id_to_index.items()}
            self._metadata = dict(data["metadata"].item())
            self._next_index = max(self._id_to_index.values(), default=-1) + 1

        return True

    def save(self) -> None:
        if self._index is None:
            return

        self._index_path.mkdir(parents=True, exist_ok=True)
        index_file = self._index_path / "index.faiss"
        meta_file = self._index_path / "metadata.npz"

        faiss.write_index(self._index, str(index_file))
        np.savez(
            meta_file,
            id_to_index=np.array([self._id_to_index], dtype=object),
            metadata=np.array([self._metadata], dtype=object),
        )

    def upsert(self, id: str, embedding: np.ndarray, metadata: dict[str, Any]) -> None:
        if self._index is None:
            self.initialize()

        assert self._index is not None

        if id in self._id_to_index:
            idx = self._id_to_index[id]
            ids_to_remove = np.ascontiguousarray(np.array([idx], dtype=np.int64))
            sel = faiss.IDSelectorBatch(ids_to_remove.size, faiss.swig_ptr(ids_to_remove))
            self._index.remove_ids(sel)
        else:
            idx = self._next_index
            self._next_index += 1
            self._id_to_index[id] = idx

        self._index.add_with_ids(
            embedding.astype(np.float32).reshape(1, -1),
            np.array([idx], dtype=np.int64),
        )
        self._index_to_id[idx] = id
        self._metadata[idx] = metadata

    def query(self, embedding: np.ndarray, top_k: int) -> list[tuple[str, float, dict[str, Any]]]:
        if self._index is None or self._index.ntotal == 0:
            return []

        distances, indices = self._index.search(
            embedding.astype(np.float32).reshape(1, -1), top_k
        )

        results: list[tuple[str, float, dict[str, Any]]] = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0:
                continue
            doc_id = self._index_to_id.get(idx)
            if doc_id is None:
                continue
            meta = self._metadata.get(idx, {})
            results.append((doc_id, float(dist), meta))

        return results

    def delete(self, id: str) -> bool:
        if self._index is None or id not in self._id_to_index:
            return False

        idx = self._id_to_index[id]
        ids_to_remove = np.ascontiguousarray(np.array([idx], dtype=np.int64))
        sel = faiss.IDSelectorBatch(ids_to_remove.size, faiss.swig_ptr(ids_to_remove))
        self._index.remove_ids(sel)
        del self._id_to_index[id]
        del self._index_to_id[idx]
        del self._metadata[idx]

        return True

    @property
    def is_loaded(self) -> bool:
        return self._index is not None and self._index.ntotal >= 0
