"""
Tool Adapter Base Class — abstract contract for all forensic tool adapters.
"""
from __future__ import annotations

import abc
from typing import Any, Dict, List
from uuid import UUID

from models.sift_types import EvidenceType, ToolRun, ToolName


class BaseAdapter(abc.ABC):
    """
    Abstract base class for all Protocol SIFT forensic tool adapters.
    Each adapter wraps one external forensic tool.
    """

    @property
    @abc.abstractmethod
    def name(self) -> ToolName:
        """Unique ToolName enum value for this adapter."""
        ...

    @property
    @abc.abstractmethod
    def version(self) -> str:
        """Version string of the underlying tool."""
        ...

    @property
    @abc.abstractmethod
    def supported_evidence_types(self) -> List[EvidenceType]:
        """List of EvidenceType values this adapter can process."""
        ...

    @property
    def description(self) -> str:
        return f"{self.name.value} forensic tool adapter"

    def can_analyze(self, evidence_type: EvidenceType) -> bool:
        """Return True if this adapter supports the given evidence type."""
        return evidence_type in self.supported_evidence_types

    @abc.abstractmethod
    async def analyze(
        self,
        evidence_path: str,
        evidence_type: EvidenceType,
        case_id: str,
        evidence_id: str,
        parameters: Dict[str, Any] | None = None,
    ) -> ToolRun:
        """
        Execute the tool against the evidence file.
        Must return a fully populated ToolRun with parsed_output and confidence.
        """
        ...

    @abc.abstractmethod
    async def is_available(self) -> bool:
        """Check if the tool is installed / reachable on the system."""
        ...

    async def validate_output(self, run: ToolRun) -> bool:
        """
        Optional post-processing validation.
        Override to add tool-specific sanity checks.
        """
        return run.errors_count == 0
