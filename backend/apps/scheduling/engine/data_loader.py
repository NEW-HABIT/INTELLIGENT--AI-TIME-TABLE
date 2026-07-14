"""
Data Loader — Transforms Django ORM data into solver-ready format
"""
import logging
from datetime import time, timedelta, datetime, date

logger = logging.getLogger("apps.scheduling.engine")

LUNCH_START = time(13, 15)
LUNCH_END = time(14, 15)
DAY_START = time(9, 30)
DAY_END = time(16, 30)
SLOT_MINUTES = 30


def time_to_slot_index(t: time) -> int:
    """Convert wall-clock time to 30-min slot index from 09:30"""
    base = datetime.combine(date.today(), DAY_START)
    target = datetime.combine(date.today(), t)
    delta_min = (target - base).total_seconds() / 60
    return int(delta_min // SLOT_MINUTES)


# Precompute slot count
TOTAL_SLOTS = time_to_slot_index(DAY_END)  # e.g. 14 slots in 9:30-16:30


class DataLoader:
    """
    Loads all required data from the database for a given semester
    and transforms it into a flat, serializable format for the solver.
    """

    def __init__(self, semester_id: str, config: dict = None):
        self.semester_id = semester_id
        self.config = config or {}

    def load(self) -> dict:
        """
        Returns a dict with all solver inputs:
        {
            allocations, rooms, days, slots_per_day,
            faculty_unavailability, faculty_preferences,
            holiday_weekdays, locked_slots,
            constraint_weights, num_workers
        }
        """
        from apps.scheduling.models import (
            Semester, SubjectAllocation, TimetableSlot, TimetableGeneration
        )
        from apps.core.models import Room, Holiday, DayOfWeek
        from apps.faculty.models import FacultyAvailability

        semester = Semester.objects.select_related("academic_year").get(id=self.semester_id)

        # ── Allocations ───────────────────────────────────────────────────
        allocations_qs = SubjectAllocation.objects.filter(
            semester=semester, is_active=True
        ).select_related(
            "subject", "faculty__user", "section__program"
        ).prefetch_related("section__enrollments")

        allocations = []
        for alloc in allocations_qs:
            enrolled = alloc.section.enrollments.filter(is_active=True).count()
            weekly_sessions = max(1, alloc.weekly_hours // 2)  # 2h per session for theory
            if alloc.subject.is_lab:
                weekly_sessions = alloc.subject.lab_hours_per_week  # 1 session = 3h block

            allocations.append({
                "id": str(alloc.id),
                "subject_id": str(alloc.subject.id),
                "subject_code": alloc.subject.code,
                "subject_name": alloc.subject.name,
                "faculty_id": str(alloc.faculty.id),
                "faculty_name": alloc.faculty.user.full_name,
                "section_id": str(alloc.section.id),
                "section_name": str(alloc.section),
                "is_lab": alloc.subject.is_lab,
                "weekly_hours": alloc.weekly_hours,
                "weekly_sessions": weekly_sessions,
                "enrolled_students": enrolled,
                "difficulty_level": alloc.subject.difficulty_level,
                "max_weekly_hours_faculty": alloc.faculty.max_weekly_hours,
            })

        # ── Rooms ─────────────────────────────────────────────────────────
        rooms = []
        for room in Room.objects.filter(is_active=True):
            rooms.append({
                "id": str(room.id),
                "number": room.number,
                "room_type": room.room_type,
                "capacity": room.capacity,
                "department_id": str(room.department_id) if room.department_id else None,
            })

        # ── Time ──────────────────────────────────────────────────────────
        days = list(range(6))  # Monday (0) to Saturday (5)
        # Exclude Saturday if not configured
        if not self.config.get("include_saturday", False):
            days = list(range(5))

        slots_per_day = TOTAL_SLOTS

        # ── Faculty Unavailability ─────────────────────────────────────────
        faculty_unavailability: dict = {}
        faculty_preferences: dict = {}

        for avail in FacultyAvailability.objects.filter(
            semester=semester
        ).select_related("faculty"):
            fac_id = str(avail.faculty.id)
            day = avail.day
            start_slot = time_to_slot_index(avail.start_time)
            end_slot = time_to_slot_index(avail.end_time)

            if not avail.is_available:
                # Unavailability
                faculty_unavailability.setdefault(fac_id, {}).setdefault(day, [])
                faculty_unavailability[fac_id][day].append((start_slot, end_slot))
            else:
                # Preference
                faculty_preferences.setdefault(fac_id, {}).setdefault(day, [])
                faculty_preferences[fac_id][day].append((start_slot, end_slot))

        # ── Holidays ──────────────────────────────────────────────────────
        # Convert holiday dates to weekday indices (0=Mon, 6=Sun)
        holiday_days = set()
        for holiday in Holiday.objects.filter(
            date__gte=semester.start_date,
            date__lte=semester.end_date
        ):
            # Only exclude the weekday across all weeks
            holiday_days.add(holiday.date.weekday())

        # ── Locked Slots (from manual overrides) ──────────────────────────
        locked_slots = []
        active_gen = TimetableGeneration.objects.filter(
            semester=semester, is_active=True
        ).first()

        if active_gen:
            for slot in active_gen.slots.filter(is_locked=True).select_related(
                "allocation", "room"
            ).prefetch_related("time_slots"):
                time_slots = list(slot.time_slots.order_by("slot_number"))
                if time_slots:
                    start_slot = time_to_slot_index(time_slots[0].start_time)
                    locked_slots.append({
                        "allocation_id": str(slot.allocation.id),
                        "day": slot.day,
                        "slot_start": start_slot,
                        "room_id": str(slot.room.id),
                    })

        # ── Constraint weights (from config/settings) ─────────────────────
        from django.conf import settings
        constraint_weights = {
            **getattr(settings, "CONSTRAINT_WEIGHTS", {}),
            **self.config.get("constraint_weights", {}),
        }

        logger.info(
            f"DataLoader: {len(allocations)} allocations, {len(rooms)} rooms, "
            f"{len(days)} days, {slots_per_day} slots/day"
        )

        return {
            "semester_id": str(semester.id),
            "semester_name": str(semester),
            "allocations": allocations,
            "rooms": rooms,
            "days": days,
            "slots_per_day": slots_per_day,
            "faculty_unavailability": faculty_unavailability,
            "faculty_preferences": faculty_preferences,
            "holiday_weekdays": list(holiday_days),
            "locked_slots": locked_slots,
            "constraint_weights": constraint_weights,
            "num_workers": self.config.get("num_workers", 2),
            "include_saturday": self.config.get("include_saturday", False),
        }
