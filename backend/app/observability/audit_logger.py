"""
Audit Logger — structured audit events for every security-relevant action.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

import structlog

from database.redis import get_redis
from models.sift_types import AuditEvent

log = structlog.get_logger()

_AUDIT_KEY = "sift:audit:{id}"
_AUDIT_STREAM = "sift:audit:stream"


class AuditLogger:
    """
    Writes structured audit events to Redis Streams.
    In production, these would be forwarded to a SIEM or Splunk.
    """

    async def log(
        self,
        actor: str,
        action: str,
        resource_type: str = "",
        resource_id: str = "",
        tool: str | None = None,
        details: str = "",
        status: str = "success",
        ip_address: str = "127.0.0.1",
    ) -> AuditEvent:
        event = AuditEvent(
            id=uuid4(),
            actor=actor,
            action=action,
            tool=tool,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            status=status,
            ip_address=ip_address,
        )

        r = get_redis()
        await r.xadd(
            _AUDIT_STREAM,
            {
                "id": str(event.id),
                "actor": event.actor,
                "action": event.action,
                "resource_type": event.resource_type,
                "resource_id": event.resource_id,
                "tool": event.tool or "",
                "status": event.status,
                "timestamp": event.timestamp.isoformat(),
                "details": event.details,
                "ip": event.ip_address,
            },
            maxlen=10000,  # Rolling 10K events
        )

        log.info(
            "audit",
            actor=event.actor,
            action=event.action,
            resource=f"{event.resource_type}/{event.resource_id}",
            status=event.status,
        )

        return event

    async def get_recent(self, count: int = 100) -> list:
        r = get_redis()
        entries = await r.xrevrange(_AUDIT_STREAM, count=count)
        return [
            {k: v for k, v in fields.items()}
            for _, fields in entries
        ]


audit_logger = AuditLogger()
