"""
Confidence Engine — multi-factor scoring for investigation findings.
"""
from __future__ import annotations

from typing import List
from uuid import UUID

from core.config import get_settings
from models.sift_types import ConfidenceFactors, ConfidenceResult, Finding

settings = get_settings()


class ConfidenceEngine:
    """
    Computes a weighted confidence score for each finding.
    Uses 7 factors to produce a 0.0 → 1.0 score.
    """

    WEIGHTS = {
        "evidence_quality": 0.20,
        "evidence_quantity": 0.15,
        "source_reliability": 0.15,
        "tool_agreement": 0.20,
        "correlation_strength": 0.15,
        "validation_results": 0.10,
        "contradiction_penalty": -0.15,
    }

    def score(
        self,
        finding: Finding,
        tool_run_count: int = 1,
        tools_agreeing: int = 1,
        validation_passed: int = 0,
        validation_total: int = 1,
        contradiction_count: int = 0,
    ) -> ConfidenceResult:
        # Evidence quality: how rich is the supporting evidence?
        evidence_quality = min(1.0, len(finding.supporting_evidence) / 5)

        # Evidence quantity: how many evidence sources are referenced?
        evidence_quantity = min(1.0, len(finding.evidence_refs) / 4)

        # Source reliability: based on number of tool runs
        source_reliability = min(1.0, tool_run_count / 3)

        # Tool agreement: what fraction of tools agree?
        tool_agreement = tools_agreeing / max(tool_run_count, 1)

        # Correlation strength: how well does this link to other findings?
        correlation_strength = min(1.0, len(finding.mitre_tactics) / 3 + 0.1)

        # Validation results
        validation_results = (
            validation_passed / validation_total if validation_total > 0 else 0.0
        )

        # Contradiction penalty
        contradiction_penalty = min(1.0, contradiction_count * 0.2)

        factors = ConfidenceFactors(
            evidence_quality=round(evidence_quality, 4),
            evidence_quantity=round(evidence_quantity, 4),
            source_reliability=round(source_reliability, 4),
            tool_agreement=round(tool_agreement, 4),
            correlation_strength=round(correlation_strength, 4),
            validation_results=round(validation_results, 4),
            contradiction_penalty=round(contradiction_penalty, 4),
        )

        # Weighted sum
        raw = (
            factors.evidence_quality * self.WEIGHTS["evidence_quality"]
            + factors.evidence_quantity * self.WEIGHTS["evidence_quantity"]
            + factors.source_reliability * self.WEIGHTS["source_reliability"]
            + factors.tool_agreement * self.WEIGHTS["tool_agreement"]
            + factors.correlation_strength * self.WEIGHTS["correlation_strength"]
            + factors.validation_results * self.WEIGHTS["validation_results"]
            - factors.contradiction_penalty * abs(self.WEIGHTS["contradiction_penalty"])
        )

        score = max(0.0, min(1.0, raw))
        requires_reinvestigation = score < settings.CONFIDENCE_REINVESTIGATE_THRESHOLD

        return ConfidenceResult(
            finding_id=finding.id,
            score=round(score, 4),
            factors=factors,
            supporting_evidence=finding.supporting_evidence,
            contradicting_evidence=finding.contradicting_evidence,
            requires_reinvestigation=requires_reinvestigation,
        )

    def score_from_tool_run(
        self, finding: Finding, tool_confidence: float
    ) -> float:
        """Quick single-tool confidence estimation."""
        return round(
            (tool_confidence * 0.6) + (len(finding.supporting_evidence) / 5 * 0.4),
            4,
        )


confidence_engine = ConfidenceEngine()
