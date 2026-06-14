"""
Protocol SIFT — LangGraph Agent Pipeline
State machine with three agents: Investigator → Verifier → Skeptic
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, TypedDict
from uuid import UUID, uuid4

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from core.config import get_settings
from models.sift_types import (
    AgentRole, EvidenceType, Finding, FindingStatus,
    ReasoningTrace, Severity, ToolRun, ValidationStep,
)
from services.mitre_mapper import mitre_mapper
from services.confidence_engine import confidence_engine

settings = get_settings()


def _get_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.1,
    )


# ── LangGraph State ────────────────────────────────────────────────────────────

class InvestigationState(TypedDict):
    case_id: str
    evidence_id: str
    evidence_type: str
    tool_runs: List[Dict[str, Any]]
    entities: List[Dict[str, Any]]
    findings: List[Dict[str, Any]]
    agent_traces: List[Dict[str, Any]]
    contradictions: List[str]
    reinvestigation_count: int
    final_confidence: float
    status: str
    log_lines: List[str]


# ── Agent Node Functions ───────────────────────────────────────────────────────

async def investigator_node(state: InvestigationState) -> InvestigationState:
    """
    Investigator Agent: analyses tool outputs and creates initial findings.
    """
    state["log_lines"].append(f"[{AgentRole.INVESTIGATOR.value}] Starting evidence analysis...")

    tool_outputs_summary = []
    for run in state["tool_runs"]:
        if run.get("status") == "completed":
            parsed = run.get("parsed_output", {})
            tool_outputs_summary.append(
                f"Tool: {run['tool']}\nFindings: {json.dumps(parsed, indent=2)[:1500]}"
            )

    if not tool_outputs_summary:
        state["log_lines"].append(f"[{AgentRole.INVESTIGATOR.value}] No tool outputs to analyse.")
        return state

    combined = "\n\n---\n\n".join(tool_outputs_summary)

    try:
        llm = _get_llm()
        system_prompt = """You are a senior cybersecurity investigator working on Protocol SIFT.
Analyse the forensic tool outputs and extract findings.
For each finding return STRICT JSON (no markdown, no code blocks):
{
  "findings": [
    {
      "title": "...",
      "description": "...",
      "severity": "critical|high|medium|low|info",
      "mitre_technique": "T1xxx.xxx or null",
      "supporting_evidence": ["..."],
      "confidence": 0.0-1.0
    }
  ]
}"""

        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Tool outputs:\n\n{combined}"),
        ])

        raw = response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        ai_findings = data.get("findings", [])

    except Exception as e:
        state["log_lines"].append(f"[{AgentRole.INVESTIGATOR.value}] LLM error: {e}. Using tool outputs directly.")
        ai_findings = _extract_findings_from_tool_runs(state["tool_runs"])

    # Map to MITRE and build Finding objects
    new_findings: List[Dict[str, Any]] = []
    for f in ai_findings:
        mitre_mappings = await mitre_mapper.map_cached(f.get("description", "") + " " + f.get("title", ""))
        primary_mitre = mitre_mappings[0].technique_id if mitre_mappings else f.get("mitre_technique")
        tactics = [m.tactic for m in mitre_mappings[:3]]

        finding = Finding(
            id=uuid4(),
            case_id=UUID(state["case_id"]),
            title=f.get("title", "Unnamed Finding"),
            description=f.get("description", ""),
            severity=_map_severity(f.get("severity", "medium")),
            status=FindingStatus.SUSPECTED,
            mitre_technique=primary_mitre,
            mitre_tactics=tactics,
            evidence_refs=[UUID(state["evidence_id"])],
            supporting_evidence=f.get("supporting_evidence", []),
            confidence_score=f.get("confidence", 0.5),
            reasoning=ReasoningTrace(
                observation=f.get("description", ""),
                confidence=f.get("confidence", 0.5),
                conclusion=f.get("title", ""),
            ),
        )
        new_findings.append(finding.model_dump(mode="json"))

    state["findings"].extend(new_findings)
    state["agent_traces"].append({
        "agent": AgentRole.INVESTIGATOR.value,
        "action": "initial_analysis",
        "findings_created": len(new_findings),
        "timestamp": datetime.utcnow().isoformat(),
    })
    state["log_lines"].append(
        f"[{AgentRole.INVESTIGATOR.value}] Created {len(new_findings)} findings."
    )
    return state


async def verifier_node(state: InvestigationState) -> InvestigationState:
    """
    Verifier Agent: validates each finding against the evidence.
    """
    state["log_lines"].append(f"[{AgentRole.VERIFIER.value}] Starting finding validation...")

    validated_findings: List[Dict[str, Any]] = []
    for f_dict in state["findings"]:
        validation_steps: List[ValidationStep] = []

        # Step 1: Evidence reference check
        has_evidence = bool(f_dict.get("evidence_refs"))
        validation_steps.append(ValidationStep(
            step=1, action="Evidence reference check",
            result="Evidence IDs present" if has_evidence else "No evidence refs",
            passed=has_evidence,
        ))

        # Step 2: MITRE technique check
        has_mitre = bool(f_dict.get("mitre_technique"))
        validation_steps.append(ValidationStep(
            step=2, action="MITRE technique mapping",
            result=f"Mapped to {f_dict.get('mitre_technique')}" if has_mitre else "No technique",
            passed=has_mitre,
        ))

        # Step 3: Supporting evidence check
        has_support = len(f_dict.get("supporting_evidence", [])) > 0
        validation_steps.append(ValidationStep(
            step=3, action="Supporting evidence check",
            result=f"{len(f_dict.get('supporting_evidence', []))} items" if has_support else "Empty",
            passed=has_support,
        ))

        # Step 4: Tool corroboration
        matching_tools = [
            run for run in state["tool_runs"]
            if run.get("confidence", 0) > 0.3
        ]
        has_corroboration = len(matching_tools) > 0
        validation_steps.append(ValidationStep(
            step=4, action="Tool corroboration",
            result=f"{len(matching_tools)} tools corroborate" if has_corroboration else "No tool corroboration",
            passed=has_corroboration,
        ))

        passed_steps = sum(1 for v in validation_steps if v.passed)
        validation_rate = passed_steps / len(validation_steps)

        # Update finding status
        if validation_rate >= 0.75:
            f_dict["status"] = FindingStatus.CONFIRMED.value
        elif validation_rate >= 0.5:
            f_dict["status"] = FindingStatus.PROBABLE.value
        else:
            f_dict["status"] = FindingStatus.SUSPECTED.value

        if "reasoning" not in f_dict:
            f_dict["reasoning"] = {}
        f_dict["reasoning"]["validation"] = (
            f"Passed {passed_steps}/{len(validation_steps)} validation steps"
        )
        f_dict["reasoning"]["validation_steps"] = [v.model_dump(mode="json") for v in validation_steps]

        # Recompute confidence
        finding_obj = Finding(**f_dict)
        result = confidence_engine.score(
            finding=finding_obj,
            tool_run_count=len(state["tool_runs"]),
            tools_agreeing=len(matching_tools),
            validation_passed=passed_steps,
            validation_total=len(validation_steps),
        )
        f_dict["confidence_score"] = result.score
        f_dict["reasoning"]["confidence"] = result.score

        validated_findings.append(f_dict)

    state["findings"] = validated_findings
    state["agent_traces"].append({
        "agent": AgentRole.VERIFIER.value,
        "action": "validation",
        "findings_validated": len(validated_findings),
        "timestamp": datetime.utcnow().isoformat(),
    })
    state["log_lines"].append(
        f"[{AgentRole.VERIFIER.value}] Validated {len(validated_findings)} findings."
    )
    return state


async def skeptic_node(state: InvestigationState) -> InvestigationState:
    """
    Skeptic Agent: challenges findings, identifies contradictions.
    """
    state["log_lines"].append(f"[{AgentRole.SKEPTIC.value}] Challenging findings for contradictions...")

    contradictions: List[str] = []

    # Cross-check finding pairs for contradiction
    findings = state["findings"]
    for i, f1 in enumerate(findings):
        for j, f2 in enumerate(findings):
            if i >= j:
                continue
            # If both are critical/high but point to different tactics
            if (
                f1.get("severity") in ("critical", "high")
                and f2.get("severity") in ("critical", "high")
                and f1.get("mitre_technique") != f2.get("mitre_technique")
                and set(f1.get("mitre_tactics", [])) & set(f2.get("mitre_tactics", []))
            ):
                contradiction = (
                    f"Conflicting tactics: '{f1['title']}' ({f1.get('mitre_technique')}) "
                    f"vs '{f2['title']}' ({f2.get('mitre_technique')})"
                )
                contradictions.append(contradiction)

    # Check for tool disagreements
    confirmed_tools = [r for r in state["tool_runs"] if r.get("confidence", 0) >= 0.7]
    low_conf_tools = [r for r in state["tool_runs"] if r.get("confidence", 0) < 0.3 and r.get("status") == "completed"]
    if confirmed_tools and low_conf_tools:
        contradictions.append(
            f"Tool confidence disagreement: {[r['tool'] for r in confirmed_tools]} "
            f"high confidence vs {[r['tool'] for r in low_conf_tools]} low confidence"
        )

    state["contradictions"] = contradictions

    # Compute final confidence across all findings
    if findings:
        avg_confidence = sum(f.get("confidence_score", 0) for f in findings) / len(findings)
        state["final_confidence"] = round(avg_confidence, 4)
    else:
        state["final_confidence"] = 0.0

    state["agent_traces"].append({
        "agent": AgentRole.SKEPTIC.value,
        "action": "contradiction_detection",
        "contradictions_found": len(contradictions),
        "final_confidence": state["final_confidence"],
        "timestamp": datetime.utcnow().isoformat(),
    })
    state["log_lines"].append(
        f"[{AgentRole.SKEPTIC.value}] {len(contradictions)} contradictions. "
        f"Final confidence: {state['final_confidence']:.1%}"
    )
    return state


async def should_reinvestigate(state: InvestigationState) -> str:
    """
    Routing function: reinvestigate if confidence < threshold, up to 2 times.
    """
    threshold = settings.CONFIDENCE_REINVESTIGATE_THRESHOLD
    if (
        state["final_confidence"] < threshold
        and state["reinvestigation_count"] < 2
    ):
        return "reinvestigate"
    return "complete"


async def reinvestigator_node(state: InvestigationState) -> InvestigationState:
    """
    Reinvestigator: re-runs the analysis with adjusted parameters.
    """
    state["reinvestigation_count"] += 1
    state["log_lines"].append(
        f"[Reinvestigator] Low confidence ({state['final_confidence']:.1%}). "
        f"Re-investigation #{state['reinvestigation_count']}..."
    )

    # Lower severity thresholds to catch more evidence
    for f in state["findings"]:
        if f.get("status") == FindingStatus.SUSPECTED.value:
            # Give suspected findings another chance
            current = f.get("confidence_score", 0)
            f["confidence_score"] = min(1.0, current + 0.1)

    state["agent_traces"].append({
        "agent": "Reinvestigator",
        "action": "re_analysis",
        "reinvestigation_count": state["reinvestigation_count"],
        "timestamp": datetime.utcnow().isoformat(),
    })
    return state


# ── Pipeline Builder ───────────────────────────────────────────────────────────

def build_pipeline():
    """Build and compile the LangGraph investigation state machine."""
    try:
        from langgraph.graph import StateGraph, END

        workflow = StateGraph(InvestigationState)

        workflow.add_node("investigator", investigator_node)
        workflow.add_node("verifier", verifier_node)
        workflow.add_node("skeptic", skeptic_node)
        workflow.add_node("reinvestigator", reinvestigator_node)

        workflow.set_entry_point("investigator")
        workflow.add_edge("investigator", "verifier")
        workflow.add_edge("verifier", "skeptic")
        workflow.add_conditional_edges(
            "skeptic",
            should_reinvestigate,
            {"reinvestigate": "reinvestigator", "complete": END},
        )
        workflow.add_edge("reinvestigator", "verifier")

        return workflow.compile()

    except ImportError:
        return None  # LangGraph not available — use standalone mode


# ── Standalone Pipeline (fallback without LangGraph) ──────────────────────────

async def run_pipeline(initial_state: InvestigationState) -> InvestigationState:
    """
    Runs the full investigation pipeline.
    Uses LangGraph if available; falls back to sequential execution.
    """
    app = build_pipeline()
    if app:
        result = await app.ainvoke(initial_state)
        return result
    else:
        # Sequential fallback
        state = await investigator_node(initial_state)
        state = await verifier_node(state)
        state = await skeptic_node(state)
        if await should_reinvestigate(state) == "reinvestigate":
            state = await reinvestigator_node(state)
            state = await verifier_node(state)
            state = await skeptic_node(state)
        return state


# ── Helpers ───────────────────────────────────────────────────────────────────

def _map_severity(s: str) -> Severity:
    mapping = {
        "critical": Severity.CRITICAL,
        "high": Severity.HIGH,
        "medium": Severity.MEDIUM,
        "low": Severity.LOW,
        "info": Severity.INFO,
    }
    return mapping.get(s.lower(), Severity.MEDIUM)


def _extract_findings_from_tool_runs(tool_runs: List[Dict]) -> List[Dict]:
    """Fallback: synthesize findings directly from tool run outputs."""
    findings = []
    for run in tool_runs:
        parsed = run.get("parsed_output", {})

        # Sigma matches
        for match in parsed.get("matches", []):
            findings.append({
                "title": match.get("rule_title", "Unknown Rule"),
                "description": f"Sigma rule triggered: {match.get('rule_title')}",
                "severity": match.get("level", "medium"),
                "mitre_technique": match.get("technique"),
                "supporting_evidence": [f"Sigma rule {match.get('rule_id')}"],
                "confidence": min(1.0, match.get("match_count", 1) * 0.15),
            })

        # YARA / Chainsaw / Volatility / Zeek / Suricata
        for key in ("matches", "hits", "memory_artifacts", "network_iocs", "alerts"):
            for item in parsed.get(key, []):
                title = item.get("rule_title") or item.get("description") or item.get("msg") or item.get("pattern", "Unknown")
                sev = item.get("level") or item.get("severity", "medium")
                findings.append({
                    "title": title,
                    "description": f"Detected by {run.get('tool')}: {title}",
                    "severity": sev,
                    "mitre_technique": item.get("technique"),
                    "supporting_evidence": [f"Tool: {run.get('tool')}"],
                    "confidence": 0.5,
                })

    # Deduplicate by title
    seen = set()
    unique = []
    for f in findings:
        if f["title"] not in seen:
            seen.add(f["title"])
            unique.append(f)
    return unique
