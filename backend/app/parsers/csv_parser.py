"""CSV log parser — returns NormalizedLog records."""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Any, Dict, List

from models.normalized_log import NormalizedLog
from parsers.json_parser import _extract_fields

def parse(
    content: str,
    investigation_id: str,
    evidence_id: str,
) -> List[NormalizedLog]:
    """
    Parse CSV content into NormalizedLog records.
    """
    logs: List[NormalizedLog] = []
    
    content_stripped = content.strip()
    if not content_stripped:
        return logs

    f = io.StringIO(content_stripped)
    reader = csv.DictReader(f)
    
    if not reader.fieldnames:
        return logs
        
    for row in reader:
        # Convert row dict to fields
        fields = _extract_fields(row)
        
        logs.append(NormalizedLog(
            investigation_id=investigation_id,
            evidence_id=evidence_id,
            raw_data=dict(row),
            **fields,
        ))
        
    return logs
