"""
Evidence Object Store — handles file persistence to disk.
In production this would swap to an S3-compatible backend (MinIO, GCS, S3).
"""
from __future__ import annotations

import hashlib
import mimetypes
import os
import shutil
from pathlib import Path
from uuid import UUID

import aiofiles
from fastapi import UploadFile

from core.config import get_settings

settings = get_settings()


class ObjectStore:
    """Local file system object store for forensic evidence files."""

    def __init__(self, base_path: str | None = None):
        self.base = Path(base_path or settings.EVIDENCE_STORAGE_PATH)
        self.base.mkdir(parents=True, exist_ok=True)

    def _case_dir(self, case_id: UUID) -> Path:
        d = self.base / str(case_id)
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _evidence_path(self, case_id: UUID, evidence_id: UUID, filename: str) -> Path:
        return self._case_dir(case_id) / f"{evidence_id}_{filename}"

    async def store(
        self, upload: UploadFile, case_id: UUID, evidence_id: UUID
    ) -> tuple[str, str, str, int]:
        """
        Persist an uploaded file.
        Returns (storage_path, sha256, md5, size_bytes).
        """
        safe_name = Path(upload.filename or "evidence").name
        dest = self._evidence_path(case_id, evidence_id, safe_name)

        sha256 = hashlib.sha256()
        md5 = hashlib.md5()
        size = 0

        async with aiofiles.open(dest, "wb") as f:
            while chunk := await upload.read(1024 * 1024):  # 1 MB chunks
                sha256.update(chunk)
                md5.update(chunk)
                size += len(chunk)
                await f.write(chunk)

        return str(dest), sha256.hexdigest(), md5.hexdigest(), size

    async def store_bytes(
        self,
        data: bytes,
        case_id: UUID,
        evidence_id: UUID,
        filename: str,
    ) -> tuple[str, str, str, int]:
        """Store raw bytes (for programmatically created evidence)."""
        dest = self._evidence_path(case_id, evidence_id, filename)
        sha256 = hashlib.sha256(data).hexdigest()
        md5 = hashlib.md5(data).hexdigest()

        async with aiofiles.open(dest, "wb") as f:
            await f.write(data)

        return str(dest), sha256, md5, len(data)

    def get_path(self, case_id: UUID, evidence_id: UUID, filename: str) -> Path:
        return self._evidence_path(case_id, evidence_id, filename)

    def exists(self, path: str) -> bool:
        return Path(path).exists()

    def delete(self, path: str) -> bool:
        p = Path(path)
        if p.exists():
            p.unlink()
            return True
        return False

    def delete_case(self, case_id: UUID) -> None:
        """Remove all evidence for a case."""
        d = self._case_dir(case_id)
        if d.exists():
            shutil.rmtree(d)

    def get_content_type(self, filename: str) -> str:
        mime, _ = mimetypes.guess_type(filename)
        return mime or "application/octet-stream"

    def case_storage_bytes(self, case_id: UUID) -> int:
        """Return total disk usage for a case directory."""
        d = self._case_dir(case_id)
        return sum(f.stat().st_size for f in d.rglob("*") if f.is_file())


# Module-level singleton
object_store = ObjectStore()
