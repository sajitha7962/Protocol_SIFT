"""
Investigation State Service — manages investigation lifecycle transitions backed by MongoDB.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import UUID, uuid4

from database.mongodb import col_investigations
from models.sift_types import Investigation, InvestigationCreate, InvestigationStatus


class StateService:
    """Manages investigation lifecycle state machine."""

    VALID_TRANSITIONS: Dict[InvestigationStatus, List[InvestigationStatus]] = {
        InvestigationStatus.CREATED: [InvestigationStatus.UPLOADING, InvestigationStatus.FAILED],
        InvestigationStatus.UPLOADING: [InvestigationStatus.PROCESSING, InvestigationStatus.FAILED],
        InvestigationStatus.PROCESSING: [InvestigationStatus.CORRELATING, InvestigationStatus.FAILED],
        InvestigationStatus.CORRELATING: [InvestigationStatus.VALIDATING, InvestigationStatus.FAILED],
        InvestigationStatus.VALIDATING: [
            InvestigationStatus.COMPLETED,
            InvestigationStatus.REINVESTIGATING,
            InvestigationStatus.FAILED,
        ],
        InvestigationStatus.REINVESTIGATING: [InvestigationStatus.VALIDATING, InvestigationStatus.FAILED],
        InvestigationStatus.COMPLETED: [],
        InvestigationStatus.FAILED: [InvestigationStatus.CREATED],
    }

    async def create_investigation(self, data: InvestigationCreate) -> Investigation:
        inv_id = uuid4()
        investigation = Investigation(
            id=inv_id,
            title=data.title,
            description=data.description,
            severity=data.severity,
            created_by=data.created_by,
            tags=data.tags,
        )
        
        doc = investigation.model_dump(mode="json")
        doc["investigation_id"] = str(inv_id)
        
        await col_investigations().update_one(
            {"investigation_id": str(inv_id)},
            {"$set": doc},
            upsert=True
        )
        return investigation

    async def get(self, investigation_id: UUID) -> Optional[Investigation]:
        doc = await col_investigations().find_one({"investigation_id": str(investigation_id)}, {"_id": 0})
        if not doc:
            return None
        return Investigation(**doc)

    async def list_all(self) -> List[Investigation]:
        cursor = col_investigations().find({}, {"_id": 0})
        investigations = []
        async for doc in cursor:
            investigations.append(Investigation(**doc))
        return sorted(investigations, key=lambda i: i.created_at, reverse=True)

    async def transition(
        self,
        investigation_id: UUID,
        new_status: InvestigationStatus,
    ) -> Investigation:
        inv = await self.get(investigation_id)
        if inv is None:
            raise ValueError(f"Investigation {investigation_id} not found")
        
        # Bypass transition check if already in target state
        if inv.status == new_status:
            return inv
            
        allowed = self.VALID_TRANSITIONS.get(inv.status, [])
        if new_status not in allowed:
            raise ValueError(
                f"Invalid transition: {inv.status} → {new_status}. Allowed: {allowed}"
            )
        inv.status = new_status
        inv.updated_at = datetime.now(timezone.utc)
        
        doc = inv.model_dump(mode="json")
        doc["investigation_id"] = str(investigation_id)
        
        await col_investigations().update_one(
            {"investigation_id": str(investigation_id)},
            {"$set": doc}
        )
        return inv

    async def update_confidence(
        self, investigation_id: UUID, confidence: float, threat_score: float
    ) -> Optional[Investigation]:
        inv = await self.get(investigation_id)
        if inv is None:
            return None
        inv.overall_confidence = round(confidence, 4)
        inv.threat_score = round(threat_score, 4)
        inv.updated_at = datetime.now(timezone.utc)
        
        doc = inv.model_dump(mode="json")
        doc["investigation_id"] = str(investigation_id)
        
        await col_investigations().update_one(
            {"investigation_id": str(investigation_id)},
            {"$set": doc}
        )
        return inv

    async def add_evidence_ref(self, investigation_id: UUID, evidence_id: UUID) -> None:
        inv = await self.get(investigation_id)
        if inv and evidence_id not in inv.evidence_ids:
            inv.evidence_ids.append(evidence_id)
            inv.updated_at = datetime.now(timezone.utc)
            
            doc = inv.model_dump(mode="json")
            doc["investigation_id"] = str(investigation_id)
            
            await col_investigations().update_one(
                {"investigation_id": str(investigation_id)},
                {"$set": doc}
            )

    async def add_finding_ref(self, investigation_id: UUID, finding_id: UUID) -> None:
        inv = await self.get(investigation_id)
        if inv and finding_id not in inv.finding_ids:
            inv.finding_ids.append(finding_id)
            inv.updated_at = datetime.now(timezone.utc)
            
            doc = inv.model_dump(mode="json")
            doc["investigation_id"] = str(investigation_id)
            
            await col_investigations().update_one(
                {"investigation_id": str(investigation_id)},
                {"$set": doc}
            )


state_service = StateService()

