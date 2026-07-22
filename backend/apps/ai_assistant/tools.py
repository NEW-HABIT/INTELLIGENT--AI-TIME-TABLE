"""AI Assistant tool definitions and executors for Gemini function calling"""
import logging
from typing import Any
from google.genai import types

logger = logging.getLogger("apps.ai_assistant.tools")

# ── Tool Definitions (Gemini function declarations) ────────────────────────
TIMETABLE_TOOLS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="get_free_rooms",
                description="Find rooms that are available on a specific day and time range",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "day": types.Schema(
                            type=types.Type.STRING,
                            description="Day name: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday"
                        ),
                        "start_time": types.Schema(
                            type=types.Type.STRING,
                            description="Start time in HH:MM format, e.g. 10:00"
                        ),
                        "end_time": types.Schema(
                            type=types.Type.STRING,
                            description="End time in HH:MM format, e.g. 11:00"
                        ),
                        "room_type": types.Schema(
                            type=types.Type.STRING,
                            description="THEORY, LAB, or SEMINAR. Leave empty for any type."
                        ),
                        "min_capacity": types.Schema(
                            type=types.Type.INTEGER,
                            description="Minimum room capacity needed"
                        ),
                        "semester_id": types.Schema(
                            type=types.Type.STRING,
                            description="Semester ID to check against"
                        ),
                    },
                    required=["day", "start_time", "end_time", "semester_id"]
                ),
            ),
            types.FunctionDeclaration(
                name="get_faculty_schedule",
                description="Get a faculty member's weekly schedule or schedule for a specific day",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "faculty_name": types.Schema(
                            type=types.Type.STRING,
                            description="Full or partial name of the faculty member"
                        ),
                        "day": types.Schema(
                            type=types.Type.STRING,
                            description="Specific day, or 'all' for full week"
                        ),
                        "semester_id": types.Schema(
                            type=types.Type.STRING,
                            description="Semester ID"
                        ),
                    },
                    required=["faculty_name", "semester_id"]
                ),
            ),
            types.FunctionDeclaration(
                name="move_timetable_slot",
                description="Move a scheduled class to a new time and/or room. Validates no conflicts before moving.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "slot_id": types.Schema(
                            type=types.Type.STRING,
                            description="ID of the timetable slot to move"
                        ),
                        "new_day": types.Schema(
                            type=types.Type.STRING,
                            description="New day: Monday, Tuesday, etc."
                        ),
                        "new_start_time": types.Schema(
                            type=types.Type.STRING,
                            description="New start time HH:MM"
                        ),
                        "new_room_number": types.Schema(
                            type=types.Type.STRING,
                            description="New room number, e.g. B-201"
                        ),
                    },
                    required=["slot_id"]
                ),
            ),
            types.FunctionDeclaration(
                name="get_section_timetable",
                description="Get the complete timetable for a specific section",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "section_name": types.Schema(
                            type=types.Type.STRING,
                            description="Section name, e.g. 'CS Sem-3 Section-A'"
                        ),
                        "semester_id": types.Schema(
                            type=types.Type.STRING,
                            description="Semester ID"
                        ),
                    },
                    required=["section_name", "semester_id"]
                ),
            ),
            types.FunctionDeclaration(
                name="get_conflicts_summary",
                description="Get a summary of all conflicts in the current timetable",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "semester_id": types.Schema(
                            type=types.Type.STRING,
                            description="Semester ID"
                        ),
                    },
                    required=["semester_id"]
                ),
            ),
            types.FunctionDeclaration(
                name="get_room_utilization",
                description="Get room utilization statistics",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "semester_id": types.Schema(
                            type=types.Type.STRING,
                            description="Semester ID"
                        ),
                        "room_number": types.Schema(
                            type=types.Type.STRING,
                            description="Specific room number, or empty for all rooms"
                        ),
                    },
                    required=["semester_id"]
                ),
            ),
        ]
    )
]



def execute_tool(tool_name: str, args: dict, user=None) -> dict:
    """Execute a tool call and return the result"""
    handlers = {
        "get_free_rooms": _get_free_rooms,
        "get_faculty_schedule": _get_faculty_schedule,
        "move_timetable_slot": _move_timetable_slot,
        "get_section_timetable": _get_section_timetable,
        "get_conflicts_summary": _get_conflicts_summary,
        "get_room_utilization": _get_room_utilization,
    }

    handler = handlers.get(tool_name)
    if not handler:
        return {"error": f"Unknown tool: {tool_name}"}

    return handler(args, user=user)


def _get_free_rooms(args: dict, user=None) -> dict:
    from apps.core.models import Room
    from apps.scheduling.models import TimetableGeneration, TimetableSlot
    from datetime import time

    day_map = {
        "monday": 0, "tuesday": 1, "wednesday": 2,
        "thursday": 3, "friday": 4, "saturday": 5
    }
    day = day_map.get(args["day"].lower(), 0)

    # Parse times
    start_h, start_m = map(int, args["start_time"].split(":"))
    end_h, end_m = map(int, args["end_time"].split(":"))
    start_time = time(start_h, start_m)
    end_time = time(end_h, end_m)

    room_type = args.get("room_type", "")
    min_capacity = args.get("min_capacity", 0)
    semester_id = args["semester_id"]

    # Get all rooms
    rooms_qs = Room.objects.filter(is_active=True)
    if room_type:
        rooms_qs = rooms_qs.filter(room_type=room_type.upper())
    if min_capacity:
        rooms_qs = rooms_qs.filter(capacity__gte=min_capacity)

    # Get active generation
    try:
        gen = TimetableGeneration.objects.get(semester_id=semester_id, is_active=True)
        # Get occupied rooms in this time window
        occupied_rooms = set(
            TimetableSlot.objects.filter(
                generation=gen,
                day=day,
            ).filter(
                time_slots__start_time__lt=end_time,
                time_slots__end_time__gt=start_time,
            ).values_list("room_id", flat=True)
        )
    except TimetableGeneration.DoesNotExist:
        occupied_rooms = set()

    free_rooms = [
        {
            "number": r.number,
            "type": r.room_type,
            "capacity": r.capacity,
            "block": r.block,
        }
        for r in rooms_qs if r.id not in occupied_rooms
    ]

    return {
        "success": True,
        "day": args["day"],
        "time_range": f"{args['start_time']} - {args['end_time']}",
        "free_rooms": free_rooms,
        "count": len(free_rooms),
    }


def _get_faculty_schedule(args: dict, user=None) -> dict:
    from apps.faculty.models import FacultyProfile
    from apps.scheduling.models import TimetableGeneration, TimetableSlot

    name = args["faculty_name"]
    semester_id = args["semester_id"]

    faculty_qs = FacultyProfile.objects.filter(
        user__first_name__icontains=name.split()[0] if name else ""
    ) | FacultyProfile.objects.filter(
        user__last_name__icontains=name.split()[-1] if name else ""
    )

    if not faculty_qs.exists():
        return {"success": False, "error": f"No faculty found matching '{name}'"}

    faculty = faculty_qs.first()

    try:
        gen = TimetableGeneration.objects.get(semester_id=semester_id, is_active=True)
    except TimetableGeneration.DoesNotExist:
        return {"success": False, "error": "No active timetable found for this semester"}

    slots = TimetableSlot.objects.filter(
        generation=gen,
        allocation__faculty=faculty,
    ).select_related("allocation__subject", "room").prefetch_related("time_slots")

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    schedule = []
    for slot in slots:
        time_slots = list(slot.time_slots.order_by("slot_number"))
        if time_slots:
            schedule.append({
                "day": day_names[slot.day],
                "subject": slot.allocation.subject.name,
                "code": slot.allocation.subject.code,
                "room": slot.room.number,
                "start": time_slots[0].start_time.strftime("%H:%M"),
                "end": time_slots[-1].end_time.strftime("%H:%M"),
                "is_lab": slot.is_lab_block,
            })

    return {
        "success": True,
        "faculty": faculty.user.full_name,
        "designation": faculty.get_designation_display(),
        "department": faculty.department.name,
        "schedule": schedule,
        "total_sessions": len(schedule),
    }


def _move_timetable_slot(args: dict, user=None) -> dict:
    """Move a slot — validates conflicts first"""
    from apps.scheduling.models import TimetableSlot
    from apps.core.models import Room
    from apps.scheduling.engine.incremental import IncrementalValidator

    try:
        slot = TimetableSlot.objects.select_related("generation").get(id=args["slot_id"])
    except TimetableSlot.DoesNotExist:
        return {"success": False, "error": "Slot not found"}

    if slot.is_locked:
        return {"success": False, "error": "This slot is locked and cannot be moved."}

    day_map = {
        "monday": 0, "tuesday": 1, "wednesday": 2,
        "thursday": 3, "friday": 4, "saturday": 5
    }

    new_day = day_map.get(args.get("new_day", "").lower()) if args.get("new_day") else None
    new_room = None
    if args.get("new_room_number"):
        try:
            new_room = Room.objects.get(number=args["new_room_number"])
        except Room.DoesNotExist:
            return {"success": False, "error": f"Room '{args['new_room_number']}' not found"}

    validator = IncrementalValidator(slot.generation)
    conflicts = validator.validate_slot_move(
        slot=slot,
        new_room_id=str(new_room.id) if new_room else None,
        new_day=new_day,
    )

    if conflicts:
        return {
            "success": False,
            "error": "Move would create conflicts",
            "conflicts": conflicts,
        }

    # Execute the move
    if new_day is not None:
        slot.day = new_day
    if new_room:
        slot.room = new_room
    slot.is_manual_override = True
    slot.save()

    return {
        "success": True,
        "message": f"Slot moved successfully",
        "new_day": args.get("new_day", "unchanged"),
        "new_room": args.get("new_room_number", "unchanged"),
    }


def _get_section_timetable(args: dict, user=None) -> dict:
    from apps.scheduling.models import TimetableGeneration, TimetableSlot, Section

    semester_id = args["semester_id"]
    section_name = args["section_name"]

    sections = Section.objects.filter(name__icontains=section_name)
    if not sections.exists():
        return {"success": False, "error": f"No section found matching '{section_name}'"}

    try:
        gen = TimetableGeneration.objects.get(semester_id=semester_id, is_active=True)
    except TimetableGeneration.DoesNotExist:
        return {"success": False, "error": "No active timetable found"}

    slots = TimetableSlot.objects.filter(
        generation=gen,
        allocation__section__in=sections,
    ).select_related("allocation__subject", "allocation__faculty__user", "room").prefetch_related("time_slots")

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    schedule = []
    for slot in slots:
        time_slots = list(slot.time_slots.order_by("slot_number"))
        if time_slots:
            schedule.append({
                "day": day_names[slot.day],
                "subject": slot.allocation.subject.name,
                "faculty": slot.allocation.faculty.user.full_name,
                "room": slot.room.number,
                "start": time_slots[0].start_time.strftime("%H:%M"),
                "end": time_slots[-1].end_time.strftime("%H:%M"),
                "is_lab": slot.is_lab_block,
            })

    return {"success": True, "section": section_name, "schedule": schedule}


def _get_conflicts_summary(args: dict, user=None) -> dict:
    from apps.scheduling.models import TimetableGeneration

    try:
        gen = TimetableGeneration.objects.filter(
            semester_id=args["semester_id"]
        ).order_by("-created_at").first()
    except Exception:
        return {"success": False, "error": "No generation found"}

    if not gen:
        return {"success": False, "error": "No timetable generation found"}

    return {
        "success": True,
        "status": gen.status,
        "conflicts": gen.conflicts,
        "conflicts_count": len(gen.conflicts),
        "version": gen.version,
    }


def _get_room_utilization(args: dict, user=None) -> dict:
    from apps.core.models import Room
    from apps.scheduling.models import TimetableGeneration, TimetableSlot

    try:
        gen = TimetableGeneration.objects.get(semester_id=args["semester_id"], is_active=True)
    except TimetableGeneration.DoesNotExist:
        return {"success": False, "error": "No active timetable"}

    rooms_qs = Room.objects.filter(is_active=True)
    if args.get("room_number"):
        rooms_qs = rooms_qs.filter(number=args["room_number"])

    result = []
    total_slots = gen.slots.count()

    for room in rooms_qs:
        room_slots = gen.slots.filter(room=room).count()
        # Max possible: 5 days × ~14 slots per day = 70 slots
        max_slots = 5 * 14
        util_pct = round((room_slots / max_slots) * 100, 1)
        result.append({
            "room": room.number,
            "type": room.room_type,
            "capacity": room.capacity,
            "scheduled_sessions": room_slots,
            "utilization_percent": util_pct,
        })

    return {
        "success": True,
        "rooms": sorted(result, key=lambda x: -x["utilization_percent"]),
    }
