"""Dispatcher for log parsers."""
from __future__ import annotations

import os
from typing import List
import logging

from models.normalized_log import NormalizedLog
from parsers import json_parser, csv_parser, sysmon_parser

logger = logging.getLogger(__name__)

def dispatch_parser(
    file_path: str,
    evidence_type: str,
    investigation_id: str,
    evidence_id: str,
) -> List[NormalizedLog]:
    """
    Read the file and dispatch to the correct parser based on file_path extension or content heuristic.
    """
    if not os.path.exists(file_path):
        logger.error(f"Evidence file not found: {file_path}")
        return []

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception as e:
        logger.error(f"Failed to read evidence file {file_path}: {e}")
        return []

    content_stripped = content.strip()
    if not content_stripped:
        return []

    ext = os.path.splitext(file_path)[1].lower()
    
    # 1. XML Check (Sysmon)
    if ext == ".xml" or content_stripped.startswith("<"):
        logger.info(f"Dispatching {file_path} to sysmon_parser")
        return sysmon_parser.parse(content, investigation_id, evidence_id)
        
    # 2. JSON Check
    if ext in (".json", ".jsonl", ".ndjson") or content_stripped.startswith(("{", "[")):
        logger.info(f"Dispatching {file_path} to json_parser")
        return json_parser.parse(content, investigation_id, evidence_id)

    # 3. CSV Check
    if ext == ".csv" or "," in content_stripped.splitlines()[0]:
        logger.info(f"Dispatching {file_path} to csv_parser")
        return csv_parser.parse(content, investigation_id, evidence_id)

    # Heuristic fallback
    try:
        logs = json_parser.parse(content, investigation_id, evidence_id)
        if logs:
            logger.info("Parsed successfully using fallback json_parser")
            return logs
    except Exception:
        pass

    try:
        logs = csv_parser.parse(content, investigation_id, evidence_id)
        if logs:
            logger.info("Parsed successfully using fallback csv_parser")
            return logs
    except Exception:
        pass

    try:
        logs = sysmon_parser.parse(content, investigation_id, evidence_id)
        if logs:
            logger.info("Parsed successfully using fallback sysmon_parser")
            return logs
    except Exception:
        pass

    logger.warning(f"No parser matched content of {file_path}")
    return []
