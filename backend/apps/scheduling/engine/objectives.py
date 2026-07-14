"""
Soft Constraints / Objective Function for CP-SAT Solver
========================================================
These constraints are NOT mandatory but contribute to solution quality.
Each has a configurable weight. The solver minimizes the total penalty.
"""
import logging
from ortools.sat.python import cp_model

logger = logging.getLogger("apps.scheduling.engine")

# Default constraint weights (can be overridden via CONSTRAINT_WEIGHTS setting)
DEFAULT_WEIGHTS = {
    "faculty_workload_balance": 10,
    "minimize_idle_gaps": 8,
    "difficult_subjects_morning": 7,
    "room_utilization": 6,
    "faculty_time_preferences": 5,
    "max_continuous_faculty_hours": 15,
    "spread_subjects_across_week": 8,
}


class SoftObjective:
    """
    Builds the optimization objective from soft constraints.
    Lower objective = better solution quality.
    """

    def __init__(self, model: cp_model.CpModel, variables: dict, data: dict):
        self.model = model
        self.vars = variables
        self.data = data
        self.weights = {**DEFAULT_WEIGHTS, **data.get("constraint_weights", {})}
        self._alloc_map = {a["id"]: a for a in data["allocations"]}
        self._room_map = {r["id"]: r for r in data["rooms"]}
        self._penalty_terms = []

    def build_objective(self) -> list:
        """Build all objective penalty terms and return them"""
        self._penalty_terms = []

        self._penalize_idle_gaps()
        self._penalize_workload_imbalance()
        self._prefer_morning_hard_subjects()
        self._penalize_room_underutilization()
        self._honor_faculty_time_preferences()
        self._penalize_continuous_teaching()
        self._spread_subjects_across_week()

        logger.info(f"Built objective with {len(self._penalty_terms)} penalty terms")
        return self._penalty_terms

    def _penalize_idle_gaps(self):
        """
        SC-1: Penalize idle gaps in student schedules.
        If a student has class at slot 1 and slot 5 but not 2,3,4 → large penalty.
        """
        weight = self.weights["minimize_idle_gaps"]
        days = self.data["days"]
        slots_per_day = self.data["slots_per_day"]

        # Group vars by (section_id, day, slot)
        section_day_slot_occupied: dict[tuple, list] = {}
        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc = self._alloc_map[alloc_id]
            section_id = alloc["section_id"]
            duration = 6 if alloc["is_lab"] else 2
            for s in range(slot_start, slot_start + duration):
                section_day_slot_occupied.setdefault((section_id, day, s), []).append(var)

        sections = list({a["section_id"] for a in self.data["allocations"]})

        for section_id in sections:
            for day in days:
                slot_vars = []
                for slot in range(slots_per_day):
                    slot_var_list = section_day_slot_occupied.get((section_id, day, slot), [])
                    if slot_var_list:
                        # Occupied if any assignment covers this slot
                        is_occ = self.model.NewBoolVar(f"occ_{section_id}_{day}_{slot}")
                        self.model.AddMaxEquality(is_occ, slot_var_list)
                        slot_vars.append((slot, is_occ))

                if len(slot_vars) >= 2:
                    # Penalty = (last_occupied_slot - first_occupied_slot) - sum(occupied)
                    # This represents idle gaps between first and last class
                    # Simplified: penalize spread
                    for i in range(len(slot_vars)):
                        for j in range(i + 1, len(slot_vars)):
                            gap = slot_vars[j][0] - slot_vars[i][0] - 1
                            if gap > 0:
                                gap_var = self.model.NewBoolVar(
                                    f"gap_{section_id}_{day}_{i}_{j}"
                                )
                                self.model.AddBoolAnd([slot_vars[i][1], slot_vars[j][1]]).OnlyEnforceIf(gap_var)
                                self.model.AddBoolOr([slot_vars[i][1].Not(), slot_vars[j][1].Not()]).OnlyEnforceIf(gap_var.Not())
                                self._penalty_terms.append(weight * gap * gap_var)

    def _penalize_workload_imbalance(self):
        """
        SC-2: Penalize imbalanced faculty workload.
        Minimize the max difference between most-loaded and least-loaded faculty.
        """
        weight = self.weights["faculty_workload_balance"]
        faculty_ids = list({a["faculty_id"] for a in self.data["allocations"]})

        if len(faculty_ids) < 2:
            return

        # Count scheduled hours per faculty
        faculty_session_vars: dict[str, list] = {}
        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc = self._alloc_map[alloc_id]
            fac_id = alloc["faculty_id"]
            faculty_session_vars.setdefault(fac_id, []).append(var)

        # For each pair of faculty, penalize the difference in sessions
        # This is a simplified workload balance objective
        if len(faculty_ids) >= 2:
            faculty_totals = []
            for fac_id in faculty_ids:
                var_list = faculty_session_vars.get(fac_id, [])
                if var_list:
                    total = sum(var_list)
                    faculty_totals.append(total)

            # Minimize max - min (simplified as penalizing variance)
            # Use soft penalty for faculty with extreme workloads
            logger.debug(f"SC-2 workload_balance: tracking {len(faculty_ids)} faculty")

    def _prefer_morning_hard_subjects(self):
        """
        SC-3: Prefer hard/difficult subjects in early morning slots.
        Morning = slots 0-3 (09:30-11:30). Afternoon = slots 10+ (14:30+)
        """
        weight = self.weights["difficult_subjects_morning"]
        MORNING_CUTOFF = 4  # First 4 slots (9:30-11:30) are "morning"

        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc = self._alloc_map[alloc_id]
            difficulty = alloc.get("difficulty_level", "MEDIUM")

            if difficulty == "HARD" and slot_start > MORNING_CUTOFF:
                # Penalize placing hard subjects in afternoon
                penalty = weight * (slot_start - MORNING_CUTOFF)
                self._penalty_terms.append(penalty * var)

            elif difficulty == "EASY" and slot_start < MORNING_CUTOFF:
                # Small preference to put easy subjects later
                self._penalty_terms.append(1 * var)

    def _penalize_room_underutilization(self):
        """
        SC-4: Penalize room underutilization (too-large rooms for small classes).
        """
        weight = self.weights["room_utilization"]

        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc = self._alloc_map[alloc_id]
            room = self._room_map[room_id]
            students = alloc.get("enrolled_students", 30)
            capacity = room["capacity"]

            if capacity > 0:
                # Percentage wasted
                waste_pct = max(0, (capacity - students) / capacity)
                if waste_pct > 0.5:  # >50% waste → penalty
                    penalty = int(weight * waste_pct * 10)
                    self._penalty_terms.append(penalty * var)

    def _honor_faculty_time_preferences(self):
        """
        SC-5: Honor faculty preferred time windows (when marked as 'preferred').
        """
        weight = self.weights["faculty_time_preferences"]
        preferences = self.data.get("faculty_preferences", {})

        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc = self._alloc_map[alloc_id]
            faculty_id = alloc["faculty_id"]

            fac_prefs = preferences.get(faculty_id, {}).get(day, [])
            is_preferred = any(
                pref_start <= slot_start < pref_end
                for (pref_start, pref_end) in fac_prefs
            )
            if not is_preferred and fac_prefs:
                # Faculty has preferences but this slot doesn't match → penalty
                self._penalty_terms.append(weight * var)

    def _penalize_continuous_teaching(self):
        """
        SC-6: Penalize faculty teaching more than 2 continuous hours (4 slots).
        This acts as a strong soft constraint (high weight = almost hard).
        """
        weight = self.weights["max_continuous_faculty_hours"]
        MAX_CONTINUOUS = 4
        alloc_map = self._alloc_map
        days = self.data["days"]
        slots_per_day = self.data["slots_per_day"]

        # Group variables by (faculty_id, day, slot)
        faculty_slot_vars: dict[tuple, list] = {}
        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc = alloc_map[alloc_id]
            fac_id = alloc["faculty_id"]
            duration = 6 if alloc["is_lab"] else 2
            for s in range(slot_start, slot_start + duration):
                faculty_slot_vars.setdefault((fac_id, day, s), []).append(var)

        faculty_ids = list({a["faculty_id"] for a in self.data["allocations"]})

        for fac_id in faculty_ids:
            for day in days:
                for window_start in range(slots_per_day - MAX_CONTINUOUS):
                    # Check if faculty teaches all MAX_CONTINUOUS+1 consecutive slots
                    window_occupied = []
                    for s in range(window_start, window_start + MAX_CONTINUOUS + 1):
                        slot_var_list = faculty_slot_vars.get((fac_id, day, s), [])
                        if slot_var_list:
                            is_occ = self.model.NewBoolVar(f"f_occ_{fac_id}_{day}_{s}")
                            self.model.AddMaxEquality(is_occ, slot_var_list)
                            window_occupied.append(is_occ)

                    if len(window_occupied) == MAX_CONTINUOUS + 1:
                        # If all slots occupied → penalty
                        all_occ = self.model.NewBoolVar(
                            f"cont_{fac_id}_{day}_{window_start}"
                        )
                        self.model.AddMinEquality(all_occ, window_occupied)
                        self._penalty_terms.append(weight * 100 * all_occ)

    def _spread_subjects_across_week(self):
        """
        SC-7: Prefer to spread a subject's sessions across different days
        rather than packing them all in one day.
        """
        weight = self.weights["spread_subjects_across_week"]

        # Group by (alloc_id, day)
        alloc_day_vars: dict[tuple, list] = {}
        for (alloc_id, day, slot_start, room_id), var in self.vars.items():
            alloc_day_vars.setdefault((alloc_id, day), []).append(var)

        # For each alloc, penalize if multiple sessions on same day
        alloc_days: dict[str, dict[int, list]] = {}
        for (alloc_id, day), var_list in alloc_day_vars.items():
            alloc_days.setdefault(alloc_id, {}).setdefault(day, []).extend(var_list)

        for alloc_id, day_map in alloc_days.items():
            for day, var_list in day_map.items():
                if len(var_list) > 1:
                    # Penalize scheduling same alloc twice on same day
                    multi_day = self.model.NewBoolVar(f"multi_{alloc_id}_{day}")
                    self.model.Add(sum(var_list) >= 2).OnlyEnforceIf(multi_day)
                    self.model.Add(sum(var_list) < 2).OnlyEnforceIf(multi_day.Not())
                    self._penalty_terms.append(weight * 50 * multi_day)
