"""AI Assistant views"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_spectacular.utils import extend_schema
import logging

logger = logging.getLogger("apps.ai_assistant")


class ChatView(APIView):
    """
    POST /api/ai/chat/
    Natural language interface for timetable management
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["ai"])
    def post(self, request):
        message = request.data.get("message", "").strip()
        semester_id = request.data.get("semester_id")
        history = request.data.get("history", [])

        if not message:
            return Response({"error": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

        from .agent import TimetableAgent
        from django.conf import settings

        if not settings.GEMINI_API_KEY:
            return Response(
                {"error": "AI assistant is not configured. Please set GEMINI_API_KEY."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            agent = TimetableAgent(user=request.user, semester_id=semester_id)
            result = agent.chat_message(message, history=history)

            return Response({
                "reply": result["reply"],
                "actions": result["actions"],
                "suggestions": result["suggestions"],
                "user_role": request.user.role,
            })

        except Exception as e:
            logger.exception(f"AI chat error: {e}")
            return Response(
                {"error": "AI service temporarily unavailable. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class ExplainConflictView(APIView):
    """
    POST /api/ai/explain-conflict/
    Explain why a specific scheduling conflict exists
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["ai"])
    def post(self, request):
        conflict = request.data.get("conflict", {})
        semester_id = request.data.get("semester_id")

        if not conflict:
            return Response({"error": "Conflict data required."}, status=400)

        from .agent import TimetableAgent
        agent = TimetableAgent(user=request.user, semester_id=semester_id)

        prompt = (
            f"Please explain this scheduling conflict in simple terms and suggest how to resolve it: "
            f"{conflict.get('type', 'Unknown')} — {conflict.get('message', '')}. "
            f"Provide 2-3 specific actionable solutions."
        )

        result = agent.chat_message(prompt)
        return Response({"explanation": result["reply"], "suggestions": result["suggestions"]})
