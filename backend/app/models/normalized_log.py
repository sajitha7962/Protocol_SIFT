"""
NormalizedLog — canonical log schema after parsing any raw evidence file.
All parsers must return List[NormalizedLog].
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class NormalizedLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    investigation_id: str
    evidence_id: str

    # Core fields
    timestamp: datetime
    source: str = ""         # Log source / sensor name
    host: str = ""           # Source hostname / IP
    user: str = ""           # Acting user / account
    ip: str = ""             # Remote IP (if applicable)
    process: str = ""        # Process name or path
    event_type: str = ""     # Category: auth, process, network, file, etc.
    severity: str = "medium" # info | low | medium | high | critical

    # Raw content preserved
    raw_data: Dict[str, Any] = {}

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
