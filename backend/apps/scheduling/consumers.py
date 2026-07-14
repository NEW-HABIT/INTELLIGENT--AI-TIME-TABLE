"""WebSocket consumer for real-time timetable generation progress"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger("apps.scheduling.consumers")


class TimetableGenerationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket endpoint: ws://host/ws/generation/<generation_id>/
    Admin clients connect here to receive real-time solver progress updates.
    """

    async def connect(self):
        self.generation_id = self.scope["url_route"]["kwargs"]["generation_id"]
        self.group_name = f"generation_{self.generation_id}"

        # Verify user is authenticated and is admin
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return
        if not user.is_admin:
            await self.close(code=4003)
            return

        # Join generation group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"WS connected: user={user.email}, generation={self.generation_id}")

        await self.send(json.dumps({
            "type": "connected",
            "message": "Connected to generation progress stream",
            "generation_id": self.generation_id,
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f"WS disconnected: generation={self.generation_id}, code={close_code}")

    async def receive(self, text_data):
        """Handle messages from client (e.g., cancel request)"""
        data = json.loads(text_data)
        if data.get("type") == "cancel":
            from apps.scheduling.models import TimetableGeneration, GenerationStatus
            from asgiref.sync import sync_to_async
            try:
                gen = await sync_to_async(TimetableGeneration.objects.get)(
                    id=self.generation_id
                )
                if gen.status == GenerationStatus.RUNNING and gen.celery_task_id:
                    from config.celery import app
                    app.control.revoke(gen.celery_task_id, terminate=True)
                    gen.status = GenerationStatus.FAILED
                    await sync_to_async(gen.save)(update_fields=["status"])
                    await self.send(json.dumps({
                        "type": "cancelled",
                        "message": "Timetable generation cancelled."
                    }))
            except Exception as e:
                logger.error(f"Cancel failed: {e}")

    async def generation_progress(self, event):
        """Receive message from Celery and forward to WebSocket client"""
        await self.send(json.dumps({
            "type": "progress",
            **event["data"]
        }))
