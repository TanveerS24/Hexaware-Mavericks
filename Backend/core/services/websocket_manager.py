import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Centralized WebSocket connection manager for real-time live map updates,
    grievance status broadcasts, and officer assignment alerts.
    """
    def __init__(self):
        self.active_admin_connections: List[WebSocket] = []

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.active_admin_connections.append(websocket)
        logger.info(f"Admin WebSocket connected. Total active connections: {len(self.active_admin_connections)}")

    def disconnect_admin(self, websocket: WebSocket):
        if websocket in self.active_admin_connections:
            self.active_admin_connections.remove(websocket)
            logger.info(f"Admin WebSocket disconnected. Remaining connections: {len(self.active_admin_connections)}")

    async def broadcast_json(self, data: Dict[str, Any]):
        """
        Broadcast JSON payload to all connected admin clients.
        Automatically prunes disconnected sockets.
        """
        disconnected = []
        for connection in self.active_admin_connections:
            try:
                await connection.send_text(json.dumps(data))
            except Exception as e:
                logger.warning(f"Error sending message to WebSocket client: {e}")
                disconnected.append(connection)

        for dead_conn in disconnected:
            self.disconnect_admin(dead_conn)

    async def broadcast_status_change(
        self,
        issue_id: str,
        status: str,
        officer_name: Optional[str] = None,
        officer_id: Optional[int] = None,
        assigned_at: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        category: Optional[str] = None,
        ward: Optional[str] = None,
        priority: Optional[str] = None,
        summary: Optional[str] = None
    ):
        """
        Broadcast complaint status changes (e.g. claimed/in_progress, resolved)
        with officer name and assignment timestamp for live admin map updates.
        """
        payload = {
            "type": "STATUS_CHANGE",
            "issue_id": issue_id,
            "status": status,
            "officer_name": officer_name,
            "officer_id": officer_id,
            "assigned_at": assigned_at,
            "lat": lat,
            "lng": lng,
            "category": category,
            "ward": ward,
            "priority": priority,
            "summary": summary
        }
        logger.info(f"Broadcasting live status change: {payload}")
        await self.broadcast_json(payload)


ws_manager = WebSocketManager()
