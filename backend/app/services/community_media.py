import re
import secrets
from pathlib import Path
from typing import Optional

from app.config import settings


ALLOWED_COMMUNITY_MEDIA = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MEDIA_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}

MEDIA_KEY_RE = re.compile(r"^[A-Za-z0-9_-]{24,64}\.(jpg|png|webp)$")


def sniff_image_extension(content_type: str, blob: bytes) -> Optional[str]:
    declared = ALLOWED_COMMUNITY_MEDIA.get((content_type or "").lower())

    if blob[:3] == b"\xff\xd8\xff":
        magic = ".jpg"
    elif blob[:8] == b"\x89PNG\r\n\x1a\n":
        magic = ".png"
    elif blob[:4] == b"RIFF" and blob[8:12] == b"WEBP":
        magic = ".webp"
    else:
        magic = None

    if magic is None:
        return None
    if declared is not None and declared != magic:
        return None
    return magic


def build_media_key(ext: str) -> str:
    return f"{secrets.token_urlsafe(24)}{ext}"


def save_media(blob: bytes, ext: str) -> str:
    storage_dir = settings.community_media_storage_dir
    storage_dir.mkdir(parents=True, exist_ok=True)

    for _ in range(3):
        file_key = build_media_key(ext)
        dest = storage_dir / file_key
        if not dest.exists():
            dest.write_bytes(blob)
            return file_key

    raise RuntimeError("Could not allocate a unique community media key.")


def media_path(file_key: str) -> Optional[Path]:
    if not MEDIA_KEY_RE.match(file_key):
        return None
    path = settings.community_media_storage_dir / file_key
    return path if path.exists() else None


def content_type_for_key(file_key: str) -> str:
    ext = file_key[file_key.rfind("."):].lower()
    return MEDIA_CONTENT_TYPES.get(ext, "application/octet-stream")
