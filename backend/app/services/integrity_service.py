"""
Integrity Service — SHA-256 verification and chain-of-custody tracking.
Every finding references an immutable evidence ID with a custody trail.
"""
from __future__ import annotations

import hashlib
from datetime import datetime
from pathlib import Path
from uuid import UUID

import aiofiles

from storage.evidence_store import evidence_store
from models.sift_types import CustodyEvent, EvidenceStatus


class IntegrityService:
    """Verifies evidence integrity and maintains the chain of custody."""

    async def verify_file(self, storage_path: str, expected_sha256: str) -> bool:
        """
        Re-hash the stored file and compare to the recorded hash.
        Returns True if integrity is preserved.
        """
        sha256 = hashlib.sha256()
        try:
            async with aiofiles.open(storage_path, "rb") as f:
                while chunk := await f.read(1024 * 1024):
                    sha256.update(chunk)
            return sha256.hexdigest() == expected_sha256
        except FileNotFoundError:
            return False

    async def verify_evidence(self, evidence_id: UUID) -> bool:
        """
        Full evidence verification: re-hash the file and update status.
        """
        ev = await evidence_store.get(evidence_id)
        if ev is None:
            return False

        intact = await self.verify_file(ev.storage_path or "", ev.sha256)
        new_status = EvidenceStatus.VERIFIED if intact else EvidenceStatus.CORRUPTED
        await evidence_store.update_status(evidence_id, new_status)

        custody_event = CustodyEvent(
            action="integrity_check",
            actor="system",
            hash_snapshot=ev.sha256,
            notes=f"Verification: {'PASSED' if intact else 'FAILED'}",
        )
        await evidence_store.append_custody(evidence_id, custody_event)
        return intact

    async def record_access(
        self, evidence_id: UUID, accessor: str, reason: str
    ) -> None:
        """Record an access event in the custody chain."""
        ev = await evidence_store.get(evidence_id)
        if ev is None:
            return
        event = CustodyEvent(
            action="accessed",
            actor=accessor,
            hash_snapshot=ev.sha256,
            notes=reason,
        )
        await evidence_store.append_custody(evidence_id, event)

    async def record_analysis(
        self, evidence_id: UUID, tool: str
    ) -> None:
        """Record when a forensic tool is applied to evidence."""
        ev = await evidence_store.get(evidence_id)
        if ev is None:
            return
        event = CustodyEvent(
            action="analyzed",
            actor=f"tool:{tool}",
            hash_snapshot=ev.sha256,
            notes=f"Forensic analysis using {tool}",
        )
        await evidence_store.append_custody(evidence_id, event)

    @staticmethod
    def compute_sha256_bytes(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()


integrity_service = IntegrityService()
