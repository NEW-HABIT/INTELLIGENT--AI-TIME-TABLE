"""
Conflict Explainer — Generates human-readable conflict reports
when the CP-SAT solver cannot find a feasible solution.
"""
import logging
from collections import defaultdict

logger = logging.getLogger("apps.scheduling.engine")


class ConflictExplainer:
    """
    Analyzes the scheduling data to identify and explain
    why no feasible timetable can be generated.
    """

    def __init__(self, data: dict):
        self.data = data
        self.allocations = data["allocations"]
        self.rooms = data["rooms"]
        self.days = data["days"]
        self.slots_per_day = data["slots_per_day"]

    def explain(self) -> list[dict]:
        """Run all conflict checks and return a list of conflict explanations"""
        conflicts = []
        conflicts.extend(self._check_faculty_overload())
        conflicts.extend(self._check_room_shortage())
        conflicts.extend(self._check_no_suitable_rooms())
        conflicts.extend(self._check_faculty_availability_conflicts())
        conflicts.extend(self._check_section_overload())
        return conflicts

    def _check_faculty_overload(self) -> list[dict]:
        """Check if any faculty is assigned more hours than their limit"""
        conflicts = []
        faculty_hours: dict[str, dict] = defaultdict(lambda: {"total": 0, "name": ""})

        for alloc in self.allocations:
            fac_id = alloc["faculty_id"]
            faculty_hours[fac_id]["total"] += alloc["weekly_hours"]
            faculty_hours[fac_id]["name"] = alloc["faculty_name"]
            faculty_hours[fac_id]["max"] = alloc["max_weekly_hours_faculty"]

        for fac_id, data in faculty_hours.items():
            if data["total"] > data["max"]:
                conflicts.append({
                    "type": "FACULTY_OVERLOAD",
                    "severity": "ERROR",
                    "message": (
                        f"Faculty '{data['name']}' is allocated {data['total']} hours/week "
                        f"but their maximum is {data['max']} hours/week. "
                        f"Remove {data['total'] - data['max']} hours of allocation."
                    ),
                    "faculty_id": fac_id,
                    "allocated_hours": data["total"],
                    "max_hours": data["max"],
                    "suggestion": "Reduce subject allocations for this faculty or increase their max weekly hours.",
                })

        return conflicts

    def _check_room_shortage(self) -> list[dict]:
        """Check if there are enough rooms to fit all classes"""
        conflicts = []
        total_weekly_sessions = sum(a["weekly_sessions"] for a in self.allocations)
        available_room_slots = len(self.rooms) * len(self.days) * self.slots_per_day

        if total_weekly_sessions > available_room_slots * 0.8:
            conflicts.append({
                "type": "ROOM_SHORTAGE",
                "severity": "WARNING",
                "message": (
                    f"High room utilization: {total_weekly_sessions} sessions need to fit in "
                    f"{len(self.rooms)} rooms × {len(self.days)} days. "
                    f"Consider adding more rooms or reducing sessions."
                ),
                "suggestion": "Add more rooms or reduce the number of sections/subjects.",
            })

        return conflicts

    def _check_no_suitable_rooms(self) -> list[dict]:
        """Check if each allocation has at least one suitable room"""
        conflicts = []
        theory_rooms = [r for r in self.rooms if r["room_type"] != "LAB"]
        lab_rooms = [r for r in self.rooms if r["room_type"] == "LAB"]

        for alloc in self.allocations:
            is_lab = alloc["is_lab"]
            enrolled = alloc["enrolled_students"]
            suitable_rooms = lab_rooms if is_lab else theory_rooms
            fitting_rooms = [r for r in suitable_rooms if r["capacity"] >= enrolled]

            if not fitting_rooms:
                room_type_str = "lab" if is_lab else "theory"
                conflicts.append({
                    "type": "NO_SUITABLE_ROOM",
                    "severity": "ERROR",
                    "message": (
                        f"Subject '{alloc['subject_code']}' for section '{alloc['section_name']}' "
                        f"has {enrolled} students but no {room_type_str} room can accommodate them. "
                        f"Largest suitable room capacity: "
                        f"{max((r['capacity'] for r in suitable_rooms), default=0)}."
                    ),
                    "allocation_id": alloc["id"],
                    "subject_code": alloc["subject_code"],
                    "section_name": alloc["section_name"],
                    "enrolled_students": enrolled,
                    "suggestion": (
                        f"Add a {'lab' if is_lab else 'classroom'} with capacity ≥ {enrolled}, "
                        f"or split the section into smaller groups."
                    ),
                })

        return conflicts

    def _check_faculty_availability_conflicts(self) -> list[dict]:
        """Check if faculty unavailability leaves no valid slots"""
        conflicts = []
        unavail = self.data.get("faculty_unavailability", {})
        LUNCH_SLOTS = {7, 8}

        for alloc in self.allocations:
            fac_id = alloc["faculty_id"]
            is_lab = alloc["is_lab"]
            duration = 6 if is_lab else 2
            fac_unavail = unavail.get(fac_id, {})

            viable_slots = 0
            for day in self.days:
                day_unavail = fac_unavail.get(day, [])
                for slot_start in range(self.slots_per_day - duration + 1):
                    slot_range = set(range(slot_start, slot_start + duration))
                    # Skip if crosses lunch
                    if slot_range & LUNCH_SLOTS:
                        continue
                    # Skip if crosses unavailability
                    blocked = any(
                        slot_range & set(range(u_start, u_end))
                        for (u_start, u_end) in day_unavail
                    )
                    if not blocked:
                        viable_slots += 1

            if viable_slots < alloc["weekly_sessions"]:
                conflicts.append({
                    "type": "FACULTY_AVAILABILITY_CONFLICT",
                    "severity": "ERROR",
                    "message": (
                        f"Faculty '{alloc['faculty_name']}' has only {viable_slots} viable time slots "
                        f"but needs {alloc['weekly_sessions']} session(s)/week for "
                        f"'{alloc['subject_code']}' ({alloc['section_name']}). "
                        f"Their availability constraints are too restrictive."
                    ),
                    "faculty_id": fac_id,
                    "subject_code": alloc["subject_code"],
                    "suggestion": "Reduce unavailability blocks or reduce weekly sessions for this subject.",
                })

        return conflicts

    def _check_section_overload(self) -> list[dict]:
        """Check if a section's total weekly hours exceeds feasible limits"""
        conflicts = []
        MAX_DAILY_HOURS = 6  # HC-11
        MAX_WEEKLY_HOURS = MAX_DAILY_HOURS * len(self.days)

        section_hours: dict[str, dict] = defaultdict(lambda: {"total": 0, "name": ""})
        for alloc in self.allocations:
            sec_id = alloc["section_id"]
            section_hours[sec_id]["total"] += alloc["weekly_hours"]
            section_hours[sec_id]["name"] = alloc["section_name"]

        for sec_id, data in section_hours.items():
            if data["total"] > MAX_WEEKLY_HOURS:
                conflicts.append({
                    "type": "SECTION_OVERLOAD",
                    "severity": "ERROR",
                    "message": (
                        f"Section '{data['name']}' is assigned {data['total']} hours/week "
                        f"but maximum is {MAX_WEEKLY_HOURS} (6h/day × {len(self.days)} days). "
                        f"Remove {data['total'] - MAX_WEEKLY_HOURS} hours of subjects."
                    ),
                    "section_id": sec_id,
                    "total_hours": data["total"],
                    "max_hours": MAX_WEEKLY_HOURS,
                    "suggestion": "Remove some subject allocations for this section.",
                })

        return conflicts
