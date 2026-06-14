"""
Agent Trace Service — persists LangGraph reasoning traces.
"""
from __future__ import annotations

from typing import List, Optional
from uuid import UUID, uuid4

from database.redis import set_json, get_json, get_redis
from models.sift_types import AgentTrace, AgentRole


_TRACE_KEY = "sift:trace:{id}"
_CASE_TRACES_KEY = "sift:case:{case_id}:traces"


class AgentTraceService:
    async def record(
        self,
        case_id: UUID,
        agent: AgentRole,
        action: str,
        reasoning: str,
        result: str,
        evidence_used: List[str] | None = None,
        tool_outputs: List[str] | None = None,
        confidence_before: float = 0.0,
        confidence_after: float = 0.0,
    ) -> AgentTrace:
        trace = AgentTrace(
            id=uuid4(),
            case_id=case_id,
            agent=agent,
            action=action,
            reasoning=reasoning,
            result=result,
            evidence_used=evidence_used or [],
            tool_outputs=tool_outputs or [],
            confidence_before=confidence_before,
            confidence_after=confidence_after,
        )
        await set_json(_TRACE_KEY.format(id=str(trace.id)), trace.model_dump(mode="json"))
        r = get_redis()
        await r.rpush(_CASE_TRACES_KEY.format(case_id=str(case_id)), str(trace.id))
        return trace

    async def get(self, trace_id: UUID) -> Optional[AgentTrace]:
        data = await get_json(_TRACE_KEY.format(id=str(trace_id)))
        return AgentTrace(**data) if data else None

    async def list_for_case(self, case_id: UUID) -> List[AgentTrace]:
        r = get_redis()
        ids = await r.lrange(_CASE_TRACES_KEY.format(case_id=str(case_id)), 0, -1)
        traces: List[AgentTrace] = []
        for tid in ids:
            t = await self.get(UUID(tid))
            if t:
                traces.append(t)
        return traces


agent_trace_service = AgentTraceService()
