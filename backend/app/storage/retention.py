"""
Retention Policy Service — enforces evidence lifecycle rules.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import List
from uuid import UUID

from storage.evidence_store import evidence_store
from storage.object_store import object_store


DEFAULT_RETENTION_DAYS = 365


class RetentionPolicy:
    """Removes expired evidence files and metadata."""

    def __init__(self, retention_days: int = DEFAULT_RETENTION_DAYS):
        self.retention_days = retention_days

    def _is_expired(self, uploaded_at: datetime) -> bool:
        cutoff = datetime.utcnow() - timedelta(days=self.retention_days)
        return uploaded_at < cutoff

    async def enforce(self, case_id: UUID) -> List[UUID]:
        """
        Enforce retention for all evidence in a case.
        Returns list of evidence IDs that were purged.
        """
        purged: List[UUID] = []
        all_evidence = await evidence_store.list_for_case(case_id)
        for ev in all_evidence:
            if self._is_expired(ev.uploaded_at):
                if ev.storage_path and object_store.exists(ev.storage_path):
                    object_store.delete(ev.storage_path)
                await evidence_store.delete(ev.id)
                purged.append(ev.id)
        return purged

    def get_expiry_date(self, uploaded_at: datetime) -> datetime:
        return uploaded_at + timedelta(days=self.retention_days)


retention_policy = RetentionPolicy()
