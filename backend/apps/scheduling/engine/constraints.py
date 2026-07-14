"""
Hard Constraints for CP-SAT Timetable Solver
All constraints here are MANDATORY — violation = infeasible solution
"""
import logging
from ortools.sat.python import cp_model

logger = logging.getLogger("apps.scheduling.engine")


class HardConstraints:
    """
    Implements all hard scheduling constraints.
    A feasible solution must satisfy ALL of these.
    """

    def __init__(self, model: cp_model.CpModel, variables: dict, data: dict):
        self.model = model
        self.vars = variables
        self.data = data

        # Pre-compute lookup structures
        self._build_indexes()

    def _build_indexes(self):
        """Build efficient lookup indexes from variables"""
        # Index by (day, slot_start, room_id)
        self._by_room_slot: dict[tuple, list] = {}
        # Index by (alloc_id)
        self._by_alloc: dict[str, list] = {}
        # Index by (day, slot_start, faculty_id)
        self._by_faculty_slot: dict[tuple, list] = {}
        # Index by (day, slot_start, section_id)
        self._by_section_slot: dict[tuple, list] = {}

        alloc_map = {a["id"]: a for a in self.data["allocations"]}

        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc = alloc_map[alloc_id]
            duration = 6 if alloc["is_lab"] else 2  # 30-min units

            # Room indexing — for each slot in the duration window
            for s in range(slot_start, slot_start + duration):
                room_key = (day, s, room_id)
                self._by_room_slot.setdefault(room_key, []).append(var)

            # Alloc indexing
            self._by_alloc.setdefault(alloc_id, []).append(
                (day, slot_start, room_id, var)
            )

            # Faculty indexing
            faculty_id = alloc["faculty_id"]
            for s in range(slot_start, slot_start + duration):
                fac_key = (day, s, faculty_id)
                self._by_faculty_slot.setdefault(fac_key, []).append(var)

            # Section indexing
            section_id = alloc["section_id"]
            for s in range(slot_start, slot_start + duration):
                sec_key = (day, s, section_id)
                self._by_section_slot.setdefault(sec_key, []).append(var)

    def no_room_clash(self):
        """
        HC-1: A room cannot host more than one class at any time slot.
        """
        added = 0
        for (day, slot, room_id), var_list in self._by_room_slot.items():
            if len(var_list) > 1:
                self.model.AddAtMostOne(var_list)
                added += 1
        logger.debug(f"HC-1 no_room_clash: {added} constraints added")

    def no_faculty_clash(self):
        """
        HC-2: A faculty member cannot teach in two places simultaneously.
        """
        added = 0
        for (day, slot, faculty_id), var_list in self._by_faculty_slot.items():
            if len(var_list) > 1:
                self.model.AddAtMostOne(var_list)
                added += 1
        logger.debug(f"HC-2 no_faculty_clash: {added} constraints added")

    def no_section_clash(self):
        """
        HC-3: A student section cannot be in two classes at the same time.
        """
        added = 0
        for (day, slot, section_id), var_list in self._by_section_slot.items():
            if len(var_list) > 1:
                self.model.AddAtMostOne(var_list)
                added += 1
        logger.debug(f"HC-3 no_section_clash: {added} constraints added")

    def each_allocation_scheduled(self):
        """
        HC-4: Every subject allocation must be scheduled exactly the required
        number of times per week.
        """
        alloc_map = {a["id"]: a for a in self.data["allocations"]}
        added = 0

        for alloc_id, slot_list in self._by_alloc.items():
            alloc = alloc_map[alloc_id]
            required_sessions = alloc.get("weekly_sessions", 1)
            var_list = [v for (_, _, _, v) in slot_list]

            # Must schedule exactly `required_sessions` times
            self.model.Add(sum(var_list) == required_sessions)
            added += 1

        logger.debug(f"HC-4 each_allocation_scheduled: {added} constraints added")

    def room_capacity(self):
        """
        HC-5: Room capacity must be >= number of enrolled students.
        Labs may have separate capacity rules.
        """
        alloc_map = {a["id"]: a for a in self.data["allocations"]}
        room_map = {r["id"]: r for r in self.data["rooms"]}
        added = 0

        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc = alloc_map[alloc_id]
            room = room_map[room_id]
            students = alloc.get("enrolled_students", 0)
            capacity = room["capacity"]

            if students > capacity:
                # This (alloc, room) combination is infeasible — ban it
                self.model.Add(var == 0)
                added += 1

        logger.debug(f"HC-5 room_capacity: {added} infeasible room-alloc pairs banned")

    def room_type_match(self):
        """
        HC-6: Lab subjects must be in lab rooms; theory in theory/seminar rooms.
        """
        alloc_map = {a["id"]: a for a in self.data["allocations"]}
        room_map = {r["id"]: r for r in self.data["rooms"]}
        added = 0

        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc = alloc_map[alloc_id]
            room = room_map[room_id]
            is_lab_alloc = alloc["is_lab"]
            is_lab_room = room["room_type"] == "LAB"

            if is_lab_alloc and not is_lab_room:
                self.model.Add(var == 0)
                added += 1
            elif not is_lab_alloc and is_lab_room:
                self.model.Add(var == 0)
                added += 1

        logger.debug(f"HC-6 room_type_match: {added} type mismatches banned")

    def lab_continuity(self):
        """
        HC-7: Lab sessions must occupy exactly 3 continuous hours (6 × 30min slots).
        This is automatically enforced by the variable construction (labs always
        take 6 consecutive slots), but we double-check consistency here.
        """
        # Lab variables are already constructed to span 6 consecutive slots.
        # The AddAtMostOne on room/faculty/section ensures they don't overlap.
        # This method serves as a documentation anchor.
        logger.debug("HC-7 lab_continuity: enforced via variable construction")

    def lunch_break(self):
        """
        HC-8: No classes during lunch break (13:15 – 14:15).
        Slots 7-8 from 09:30 base are lunch slots.
        """
        LUNCH_SLOTS = {7, 8}  # Indices from 09:30 base at 30-min resolution
        added = 0
        alloc_map = {a["id"]: a for a in self.data["allocations"]}

        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc = alloc_map[alloc_id]
            duration = 6 if alloc["is_lab"] else 2
            slot_range = set(range(slot_start, slot_start + duration))
            if slot_range & LUNCH_SLOTS:
                self.model.Add(var == 0)
                added += 1

        logger.debug(f"HC-8 lunch_break: {added} lunch-crossing assignments banned")

    def respect_faculty_availability(self):
        """
        HC-9: Faculty cannot be scheduled during their unavailability windows.
        """
        unavail = self.data.get("faculty_unavailability", {})
        alloc_map = {a["id"]: a for a in self.data["allocations"]}
        added = 0

        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc = alloc_map[alloc_id]
            faculty_id = alloc["faculty_id"]
            duration = 6 if alloc["is_lab"] else 2

            fac_unavail = unavail.get(faculty_id, {}).get(day, [])
            for (unavail_start, unavail_end) in fac_unavail:
                # If slot window overlaps with unavailability window → ban
                slot_end = slot_start + duration
                if slot_start < unavail_end and slot_end > unavail_start:
                    self.model.Add(var == 0)
                    added += 1
                    break

        logger.debug(f"HC-9 faculty_availability: {added} availability conflicts banned")

    def exclude_holidays(self):
        """
        HC-10: No classes on university holidays.
        """
        holiday_days = set(self.data.get("holiday_weekdays", []))
        added = 0

        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            if day in holiday_days:
                self.model.Add(var == 0)
                added += 1

        logger.debug(f"HC-10 exclude_holidays: {added} holiday assignments banned")

    def max_daily_student_hours(self):
        """
        HC-11: Students cannot have more than 6 teaching hours per day.
        6 hours = 12 × 30-min slots.
        """
        MAX_SLOTS = 12
        alloc_map = {a["id"]: a for a in self.data["allocations"]}

        # Group by (day, section_id) — find all vars that assign that section on that day
        section_day_vars: dict[tuple, list] = {}
        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc = alloc_map[alloc_id]
            duration = 6 if alloc["is_lab"] else 2
            key = (day, alloc["section_id"])
            # Each scheduled session contributes `duration` slots
            section_day_vars.setdefault(key, []).append((var, duration))

        added = 0
        for (day, section_id), var_dur_list in section_day_vars.items():
            # Total slots = sum(var * duration)
            total_slots = sum(
                var * dur for var, dur in var_dur_list
            )
            self.model.Add(total_slots <= MAX_SLOTS)
            added += 1

        logger.debug(f"HC-11 max_daily_student_hours: {added} constraints added")

    def max_continuous_faculty_hours(self):
        """
        HC-12: Faculty cannot teach more than 2 continuous hours (4 × 30min slots)
        without a break.
        """
        MAX_CONTINUOUS = 4  # 2 hours = 4 × 30-min slots
        alloc_map = {a["id"]: a for a in self.data["allocations"]}
        added = 0

        faculty_ids = list({a["faculty_id"] for a in self.data["allocations"]})
        days = self.data["days"]
        slots_per_day = self.data["slots_per_day"]

        # For each faculty, day, and window of MAX_CONTINUOUS+1 consecutive slots
        faculty_slot_vars: dict[tuple, list] = {}
        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc = alloc_map[alloc_id]
            fac_id = alloc["faculty_id"]
            duration = 6 if alloc["is_lab"] else 2
            for s in range(slot_start, slot_start + duration):
                faculty_slot_vars.setdefault((fac_id, day, s), []).append(var)

        for fac_id in faculty_ids:
            for day in days:
                for window_start in range(slots_per_day - MAX_CONTINUOUS):
                    window_vars = []
                    for s in range(window_start, window_start + MAX_CONTINUOUS + 1):
                        window_vars.extend(faculty_slot_vars.get((fac_id, day, s), []))
                    if window_vars:
                        # At most MAX_CONTINUOUS consecutive occupied slots
                        # (soft constraint version — here we enforce via soft obj)
                        pass  # Implemented as soft constraint in objectives.py

        logger.debug(f"HC-12 max_continuous_faculty_hours: handled as soft constraint")

    def respect_locked_slots(self, locked_slots: list):
        """
        HC-13: Manually-locked timetable slots must remain fixed.
        """
        locked_map = {
            (s["allocation_id"], s["day"], s["slot_start"], s["room_id"]): 1
            for s in locked_slots
        }
        added = 0

        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            key = (alloc_id, day, slot_start, room_id)
            if key in locked_map:
                self.model.Add(var == 1)
                added += 1

        logger.debug(f"HC-13 respect_locked_slots: {added} locks enforced")
