"""
Tool Registry — auto-discovers and registers all forensic tool adapters.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Type

from adapters.base import BaseAdapter
from models.sift_types import EvidenceType, ToolName


class AdapterRegistry:
    """
    Plugin registry for all tool adapters.
    Adapters register themselves by calling registry.register().
    """

    def __init__(self):
        self._adapters: Dict[ToolName, BaseAdapter] = {}

    def register(self, adapter: BaseAdapter) -> None:
        self._adapters[adapter.name] = adapter

    def get(self, name: ToolName) -> Optional[BaseAdapter]:
        return self._adapters.get(name)

    def all(self) -> List[BaseAdapter]:
        return list(self._adapters.values())

    def for_evidence(self, evidence_type: EvidenceType) -> List[BaseAdapter]:
        """Return all adapters that support the given evidence type."""
        return [
            adapter
            for adapter in self._adapters.values()
            if adapter.can_analyze(evidence_type)
        ]

    async def available(self) -> List[BaseAdapter]:
        """Return only adapters whose tools are installed / reachable."""
        result: List[BaseAdapter] = []
        for adapter in self._adapters.values():
            if await adapter.is_available():
                result.append(adapter)
        return result

    def status(self) -> Dict[str, dict]:
        return {
            name.value: {
                "version": adapter.version,
                "supported_types": [t.value for t in adapter.supported_evidence_types],
            }
            for name, adapter in self._adapters.items()
        }


# Module-level singleton registry
registry = AdapterRegistry()


def _register_all() -> None:
    """Import all adapters to trigger registration."""
    from adapters.sigma import SigmaAdapter
    from adapters.yara import YaraAdapter
    from adapters.chainsaw import ChainsawAdapter
    from adapters.volatility import VolatilityAdapter
    from adapters.zeek import ZeekAdapter
    from adapters.suricata import SuricataAdapter

    for adapter_cls in [
        SigmaAdapter,
        YaraAdapter,
        ChainsawAdapter,
        VolatilityAdapter,
        ZeekAdapter,
        SuricataAdapter,
    ]:
        registry.register(adapter_cls())


# Auto-register on import
_register_all()
