"""
Receipt storage abstraction.

Today receipts are stored on local disk OUTSIDE any static/web root and served
only through the access-controlled `/api/payments_system/receipt/{id}` endpoint.

This module defines a minimal interface so a future object-storage backend
(S3 / GCS) can be dropped in without touching the API layer. Only the local
backend is implemented now (the upload endpoint already uses local disk);
`S3ReceiptStorage` is a documented stub that must not be enabled until properly
implemented and tested.
"""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from app.config import settings


class ReceiptStorage(ABC):
    """Interface for storing and retrieving receipt files by opaque key."""

    @abstractmethod
    def save(self, file_key: str, blob: bytes) -> None: ...

    @abstractmethod
    def exists(self, file_key: str) -> bool: ...

    @abstractmethod
    def open_path(self, file_key: str) -> Optional[Path]:
        """Return a local filesystem path to stream, or None if not applicable."""
        ...


class LocalReceiptStorage(ReceiptStorage):
    """Default backend: files on local disk under settings.receipt_storage_dir."""

    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = base_dir or settings.receipt_storage_dir

    def save(self, file_key: str, blob: bytes) -> None:
        self.base_dir.mkdir(parents=True, exist_ok=True)
        dest = self.base_dir / file_key
        if not dest.exists():  # identical content dedupes
            dest.write_bytes(blob)

    def exists(self, file_key: str) -> bool:
        return (self.base_dir / file_key).exists()

    def open_path(self, file_key: str) -> Optional[Path]:
        path = self.base_dir / file_key
        return path if path.exists() else None


class S3ReceiptStorage(ReceiptStorage):
    """
    FUTURE: object-storage backend (S3/GCS). Intentionally NOT implemented.
    Implement with a signed-URL or proxy-stream retrieval that preserves the
    owner/admin-only access control before enabling in production.
    """

    def save(self, file_key: str, blob: bytes) -> None:  # pragma: no cover
        raise NotImplementedError("S3 receipt storage is not implemented yet.")

    def exists(self, file_key: str) -> bool:  # pragma: no cover
        raise NotImplementedError("S3 receipt storage is not implemented yet.")

    def open_path(self, file_key: str) -> Optional[Path]:  # pragma: no cover
        raise NotImplementedError("S3 receipt storage is not implemented yet.")


def get_receipt_storage() -> ReceiptStorage:
    """Factory — returns the active storage backend (local for now)."""
    return LocalReceiptStorage()
