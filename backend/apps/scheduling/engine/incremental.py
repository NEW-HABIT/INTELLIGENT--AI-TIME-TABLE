"""
Incremental validator for manual timetable slot edits.
Checks if a slot move would create any conflicts.
"""
import logging

logger = logging.getLogger("apps.scheduling.engine")


class IncrementalValidator:
    """Validates manual slot edits without re-running the full solver."""

    def __init__(self, generation):
        self.generation = generation

    def validate_slot_move(self, slot, new_room_id=None, new_day=None, new_slot_start=None):
        """
        Check if moving a slot would create any hard constraint violations.
        Returns a list of conflict descriptions (empty = no conflicts).
        """
        from apps.scheduling.models import TimetableSlot
        conflicts = []

        target_room_id = new_room_id or str(slot.room.id)
        target_day = new_day if new_day is not None else slot.day

        # Get time slots for the slot being moved
        current_time_slots = list(slot.time_slots.order_by("slot_number"))
        if not current_time_slots:
            return []

        duration = len(current_time_slots)

        # Find what slot_numbers the new position would occupy
        if new_slot_start is not None:
            target_slot_numbers = list(range(new_slot_start, new_slot_start + duration))
        else:
            target_slot_numbers = [ts.slot_number for ts in current_time_slots]

        # Check room clash
        from apps.core.models import TimeSlot, Room

        conflicting_room = TimetableSlot.objects.filter(
            generation=self.generation,
            room_id=target_room_id,
            day=target_day,
            time_slots__slot_number__in=target_slot_numbers,
        ).exclude(id=slot.id)

        if conflicting_room.exists():
            other = conflicting_room.first()
            conflicts.append({
                "type": "ROOM_CLASH",
                "message": f"Room {other.room.number} is already occupied by {other.allocation.subject.code} at this time.",
            })

        # Check faculty clash
        conflicting_faculty = TimetableSlot.objects.filter(
            generation=self.generation,
            allocation__faculty=slot.allocation.faculty,
            day=target_day,
            time_slots__slot_number__in=target_slot_numbers,
        ).exclude(id=slot.id)

        if conflicting_faculty.exists():
            other = conflicting_faculty.first()
            conflicts.append({
                "type": "FACULTY_CLASH",
                "message": f"{slot.allocation.faculty.user.full_name} is already teaching {other.allocation.subject.code} at this time.",
            })

        # Check section clash
        conflicting_section = TimetableSlot.objects.filter(
            generation=self.generation,
            allocation__section=slot.allocation.section,
            day=target_day,
            time_slots__slot_number__in=target_slot_numbers,
        ).exclude(id=slot.id)

        if conflicting_section.exists():
            other = conflicting_section.first()
            conflicts.append({
                "type": "SECTION_CLASH",
                "message": f"Section {slot.allocation.section.name} already has {other.allocation.subject.code} at this time.",
            })

        # Lunch break check
        LUNCH_SLOTS = {7, 8}
        if LUNCH_SLOTS & set(target_slot_numbers):
            conflicts.append({
                "type": "LUNCH_CONFLICT",
                "message": "Cannot schedule classes during the lunch break (1:15 PM – 2:15 PM).",
            })

        return conflicts
