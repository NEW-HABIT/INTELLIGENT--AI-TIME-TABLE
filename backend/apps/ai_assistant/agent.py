"""
Google Gemini AI Assistant — Natural Language Timetable Interface
Allows admins and faculty to interact with the timetable using plain English.

Examples:
- "Move Dr. Sharma's Monday 10am class to Wednesday 2pm"
- "Why is room B-201 blocked on Friday?"
- "Which rooms are free on Tuesday between 11am and 1pm?"
- "Show me all conflicts for CS section A"
"""
import json
import logging
from typing import Optional
from django.conf import settings
from google import genai
from google.genai import types

from .tools import TIMETABLE_TOOLS, execute_tool

logger = logging.getLogger("apps.ai_assistant")


class TimetableAgent:
    """
    Gemini-powered agent for natural language timetable management.
    Uses function calling to execute real timetable actions.
    """

    SYSTEM_PROMPT = """
You are an intelligent AI assistant for The Neotia University's Timetable Management System.

Your role is to help administrators and faculty members:
1. Query timetable information in natural language
2. Identify and explain scheduling conflicts
3. Suggest schedule changes and optimizations
4. Move, swap, or cancel class slots

University context:
- University hours: 9:30 AM to 4:30 PM, Monday to Saturday
- Lunch break: 1:15 PM to 2:15 PM (no classes during this time)
- Theory classes: 45-60 minutes
- Lab sessions: exactly 3 continuous hours
- Maximum 6 teaching hours per student day
- Maximum 2 continuous lecture hours per faculty

When responding:
- Be concise and professional
- Always check for conflicts before suggesting changes
- Explain the reason for any constraint violations
- Provide actionable suggestions when problems arise
- Format room names, faculty names, and times clearly

If asked to make a change, ALWAYS use the available tools to validate and execute it.
Never make up information — use the tools to get real data.
"""

    def __init__(self, user=None, semester_id: Optional[str] = None):
        self.user = user
        self.semester_id = semester_id

        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured in settings.")

        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_MODEL
        self.chat = self.client.chats.create(
            model=self.model_name,
            config=types.GenerateContentConfig(
                system_instruction=self.SYSTEM_PROMPT,
                tools=TIMETABLE_TOOLS,
            ),
        )

    def chat_message(self, user_message: str, history: list = None) -> dict:
        """
        Process a user message and return the AI response with any executed actions.

        Returns:
            {
                "reply": str,        # AI text response
                "actions": list,     # Actions executed (slot moves, etc.)
                "suggestions": list, # Suggestions for follow-up
            }
        """
        try:
            # Include semester context if available
            context_prefix = ""
            if self.semester_id:
                context_prefix = f"[Current semester ID: {self.semester_id}] "

            response = self.chat.send_message(context_prefix + user_message)
            actions_executed = []

            # Handle function calls (tool use)
            max_iterations = 5  # Prevent infinite loops
            iteration = 0

            while iteration < max_iterations:
                iteration += 1
                has_function_calls = False
                tool_results = []

                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        has_function_calls = True
                        fc = part.function_call
                        tool_name = fc.name
                        tool_args = dict(fc.args) if fc.args else {}

                        # Add semester context to tools that need it
                        if self.semester_id and "semester_id" not in tool_args:
                            tool_args["semester_id"] = self.semester_id

                        logger.info(f"AI calling tool: {tool_name}({tool_args})")

                        try:
                            result = execute_tool(
                                tool_name=tool_name,
                                args=tool_args,
                                user=self.user,
                            )
                            actions_executed.append({
                                "tool": tool_name,
                                "args": tool_args,
                                "result": result,
                                "success": result.get("success", True),
                            })
                        except Exception as e:
                            result = {"error": str(e), "success": False}

                        tool_results.append(
                            types.Part(
                                function_response=types.FunctionResponse(
                                    name=tool_name,
                                    response={"result": result},
                                )
                            )
                        )

                if not has_function_calls:
                    break

                # Send tool results back to model
                response = self.chat.send_message(tool_results)

            # Extract final text response
            reply = ""
            for part in response.candidates[0].content.parts:
                if part.text:
                    reply += part.text

            return {
                "reply": reply or "I've processed your request.",
                "actions": actions_executed,
                "suggestions": self._generate_suggestions(user_message, actions_executed),
            }

        except Exception as e:
            logger.error(f"AI agent error: {e}")
            return {
                "reply": f"I encountered an error: {str(e)}. Please try again or contact support.",
                "actions": [],
                "suggestions": [],
            }

    def _generate_suggestions(self, user_message: str, actions: list) -> list:
        """Generate follow-up suggestions based on context"""
        suggestions = []
        msg_lower = user_message.lower()

        if "conflict" in msg_lower:
            suggestions = [
                "Show me all conflicts for the current semester",
                "Which faculty have the most scheduling conflicts?",
                "Suggest alternative time slots for this class",
            ]
        elif "room" in msg_lower or "free" in msg_lower:
            suggestions = [
                "Which rooms are available on Monday morning?",
                "Show me the utilization rate for all rooms",
                "Find a lab room for 40 students on Wednesday",
            ]
        elif "faculty" in msg_lower or "professor" in msg_lower:
            suggestions = [
                "Show faculty workload summary",
                "Which faculty have gaps in their schedule?",
                "List all classes for this faculty this week",
            ]
        elif any(failed_action for failed_action in actions if not failed_action.get("success")):
            suggestions = [
                "Show conflicts preventing this change",
                "Find the next available slot for this class",
                "What are the alternative rooms for this session?",
            ]

        return suggestions[:3]
