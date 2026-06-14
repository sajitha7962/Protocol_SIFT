"""
Findings Store — CRUD for security findings backed by MongoDB.
"""
from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from database.mongodb import col_findings
from models.sift_types import Finding, FindingStatus


class FindingsStore:
    async def create(self, finding: Finding) -> Finding:
        doc = finding.model_dump(mode="json")
        doc["finding_id"] = str(finding.id)
        doc["investigation_id"] = str(finding.case_id)
        
        await col_findings().update_one(
            {"finding_id": str(finding.id)},
            {"$set": doc},
            upsert=True
        )
        return finding

    async def get(self, finding_id: UUID) -> Optional[Finding]:
        doc = await col_findings().find_one({"finding_id": str(finding_id)}, {"_id": 0})
        return Finding(**doc) if doc else None

    async def list_for_case(self, case_id: UUID) -> List[Finding]:
        cursor = col_findings().find({"investigation_id": str(case_id)}, {"_id": 0})
        findings: List[Finding] = []
        async for doc in cursor:
            findings.append(Finding(**doc))
        return sorted(findings, key=lambda f: f.detected_at, reverse=True)

    async def update_status(
        self, finding_id: UUID, status: FindingStatus
    ) -> Optional[Finding]:
        f = await self.get(finding_id)
        if not f:
            return None
        f.status = status
        
        doc = f.model_dump(mode="json")
        doc["finding_id"] = str(f.id)
        doc["investigation_id"] = str(f.case_id)
        
        await col_findings().update_one(
            {"finding_id": str(finding_id)},
            {"$set": doc}
        )
        return f

    async def update_confidence(
        self, finding_id: UUID, confidence: float
    ) -> Optional[Finding]:
        f = await self.get(finding_id)
        if not f:
            return None
        f.confidence_score = round(confidence, 4)
        
        doc = f.model_dump(mode="json")
        doc["finding_id"] = str(f.id)
        doc["investigation_id"] = str(f.case_id)
        
        await col_findings().update_one(
            {"finding_id": str(finding_id)},
            {"$set": doc}
        )
        return f


findings_store = FindingsStore()
