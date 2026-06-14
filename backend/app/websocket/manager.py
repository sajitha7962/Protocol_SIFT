"""
WebSocket Manager — broadcasts real-time events to connected clients.
"""
from __future__ import annotations

import json
from collections import defaultdict
from typing import Any, Dict, List, Set

from fastapi import WebSocket


class WebSocketManager:
    """
    Manages per-case WebSocket connections.
    Clients subscribe to a case_id and receive all events for that case.
    """

    def __init__(self):
        # case_id → set of connected WebSocket instances
        self._connections: Dict[str, Set[WebSocket]] = defaultdict(set)

    async def connect(self, case_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[case_id].add(websocket)

    def disconnect(self, case_id: str, websocket: WebSocket) -> None:
        self._connections[case_id].discard(websocket)
        if not self._connections[case_id]:
            del self._connections[case_id]

    async def broadcast(self, case_id: str, message: Any) -> None:
        """Send a message to all clients connected to this case."""
        if case_id not in self._connections:
            return

        dead: List[WebSocket] = []
        payload = json.dumps(message) if not isinstance(message, str) else message

        for ws in self._connections[case_id]:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect(case_id, ws)

    async def broadcast_all(self, message: Any) -> None:
        """Broadcast to ALL connected clients across all cases."""
        for case_id in list(self._connections.keys()):
            await self.broadcast(case_id, message)

    def active_cases(self) -> List[str]:
        return list(self._connections.keys())

    def connection_count(self, case_id: str) -> int:
        return len(self._connections.get(case_id, set()))

    def total_connections(self) -> int:
        return sum(len(ws_set) for ws_set in self._connections.values())


# Module-level singleton
ws_manager = WebSocketManager()
