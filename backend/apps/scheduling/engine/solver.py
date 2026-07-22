"""
OR-Tools CP-SAT Scheduling Solver for TNU Timetable System
=====================================================================
Models the university timetable as a constraint satisfaction and
optimization problem. Implements all hard and soft constraints.

University hours: 09:30 – 16:30
Lunch break: 13:15 – 14:15
Theory classes: 45–60 min slots
Lab sessions: exactly 3 continuous hours (6 consecutive 30-min units)
"""
import logging
from dataclasses import dataclass, field
from typing import Optional
from ortools.sat.python import cp_model

logger = logging.getLogger("apps.scheduling.engine")


@dataclass
class SolverResult:
    """Result returned by the CP-SAT solver"""
    status: str  # 'OPTIMAL', 'FEASIBLE', 'INFEASIBLE', 'UNKNOWN'
    timetable: list[dict] = field(default_factory=list)
    conflicts: list[dict] = field(default_factory=list)
    solver_stats: dict = field(default_factory=dict)
    solve_time: float = 0.0
    objective_value: Optional[int] = None
    message: str = ""


class ProgressCallback(cp_model.CpSolverSolutionCallback):
    """Callback to report solver progress via WebSocket with connection throttling"""

    def __init__(self, progress_reporter=None):
        super().__init__()
        self._progress_reporter = progress_reporter
        self._solution_count = 0
        self._best_objective = None
        self._last_report_time = 0.0

    def on_solution_callback(self):
        import time
        self._solution_count += 1
        obj = self.ObjectiveValue()
        if self._best_objective is None or obj < self._best_objective:
            self._best_objective = obj
            logger.info(f"New best solution found: objective={obj}, solutions={self._solution_count}")
            now = time.time()
            if self._progress_reporter and (now - self._last_report_time >= 1.5 or self._solution_count == 1):
                self._last_report_time = now
                try:
                    self._progress_reporter(
                        progress=min(90, 30 + self._solution_count * 5),
                        message=f"Found solution #{self._solution_count} (score: {obj})"
                    )
                except Exception as e:
                    logger.warning(f"Failed to report progress callback: {e}")


class TimetableSolver:
    """
    Main CP-SAT solver for university timetable generation.

    Architecture:
    - Time is modeled in 30-minute units (slots) from 0 to N
    - Variables are binary: assignment[alloc_id, day, slot, room_id] ∈ {0,1}
    - Hard constraints enforce feasibility
    - Soft constraints contribute to objective function (minimize)
    """

    SLOT_DURATION_MINUTES = 30
    THEORY_SLOT_COUNT = 2    # 1 hour = 2 × 30min slots
    LAB_SLOT_COUNT = 6       # 3 hours = 6 × 30min slots

    def __init__(self, data: dict, time_limit: int = 300, progress_reporter=None):
        """
        Args:
            data: Loaded data from DataLoader
            time_limit: Maximum solver time in seconds
            progress_reporter: Callable(progress%, message) for WebSocket updates
        """
        self.data = data
        self.time_limit = time_limit
        self.progress_reporter = progress_reporter
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self._vars = {}  # (alloc_id, day, slot_start, room_id) -> BoolVar

    def _report(self, progress: int, message: str):
        """Report progress to WebSocket"""
        logger.info(f"[Solver {progress}%] {message}")
        if self.progress_reporter:
            self.progress_reporter(progress=progress, message=message)

    def solve(self) -> SolverResult:
        """Main solver entry point"""
        import time

        self._report(5, "Loading scheduling data...")
        data = self.data
        allocations = data["allocations"]
        rooms = data["rooms"]
        days = data["days"]
        slots_per_day = data["slots_per_day"]
        locked_slots = data.get("locked_slots", [])

        if not allocations:
            return SolverResult(
                status="INFEASIBLE",
                conflicts=[{"type": "no_data", "message": "No subject allocations found for this semester."}],
                message="No allocations to schedule."
            )

        self._report(10, f"Building model for {len(allocations)} allocations, {len(rooms)} rooms...")

        # ── Create decision variables ─────────────────────────────────────
        self._create_variables(allocations, rooms, days, slots_per_day)

        # ── Add hard constraints ──────────────────────────────────────────
        self._report(20, "Adding hard constraints...")
        from .constraints import HardConstraints
        hc = HardConstraints(self.model, self._vars, data)
        hc.no_room_clash()
        hc.no_faculty_clash()
        hc.no_section_clash()
        hc.room_capacity()
        hc.room_type_match()
        hc.lab_continuity()
        hc.each_allocation_scheduled()
        hc.respect_locked_slots(locked_slots)
        hc.exclude_holidays()
        hc.lunch_break()

        # ── Add soft constraints (objective) ─────────────────────────────
        self._report(35, "Adding soft constraints & optimization objective...")
        from .objectives import SoftObjective
        so = SoftObjective(self.model, self._vars, data)
        objective_terms = so.build_objective()
        self.model.Minimize(sum(objective_terms))

        # ── Configure solver ──────────────────────────────────────────────
        self.solver.parameters.max_time_in_seconds = self.time_limit
        self.solver.parameters.num_search_workers = min(4, data.get("num_workers", 2))
        self.solver.parameters.log_search_progress = True

        callback = ProgressCallback(progress_reporter=self.progress_reporter)

        self._report(40, "Starting CP-SAT optimization (this may take a few minutes)...")
        start_time = time.time()

        # Run solver
        status = self.solver.Solve(self.model, callback)
        solve_time = time.time() - start_time

        self._report(85, f"Solver finished in {solve_time:.1f}s")

        # ── Process results ───────────────────────────────────────────────
        status_map = {
            cp_model.OPTIMAL: "OPTIMAL",
            cp_model.FEASIBLE: "FEASIBLE",
            cp_model.INFEASIBLE: "INFEASIBLE",
            cp_model.UNKNOWN: "UNKNOWN",
            cp_model.MODEL_INVALID: "MODEL_INVALID",
        }
        status_str = status_map.get(status, "UNKNOWN")

        solver_stats = {
            "status": status_str,
            "solve_time_seconds": round(solve_time, 2),
            "num_solutions": callback._solution_count,
            "objective_value": self.solver.ObjectiveValue() if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None,
            "num_variables": self.model.Proto().variables.__len__() if hasattr(self.model.Proto().variables, '__len__') else 0,
            "branches": self.solver.NumBranches(),
            "conflicts_solver": self.solver.NumConflicts(),
            "wall_time": self.solver.WallTime(),
        }

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            self._report(90, "Extracting timetable from solution...")
            timetable = self._extract_solution(allocations, rooms, days, slots_per_day)
            self._report(98, "Timetable generated successfully!")
            return SolverResult(
                status=status_str,
                timetable=timetable,
                solver_stats=solver_stats,
                solve_time=solve_time,
                objective_value=self.solver.ObjectiveValue(),
                message=f"Timetable generated successfully with {len(timetable)} scheduled slots.",
            )
        else:
            self._report(95, "No feasible solution found — generating conflict report...")
            from .conflict_explainer import ConflictExplainer
            explainer = ConflictExplainer(data)
            conflicts = explainer.explain()
            return SolverResult(
                status=status_str,
                conflicts=conflicts,
                solver_stats=solver_stats,
                solve_time=solve_time,
                message="No feasible timetable found. See conflicts for details.",
            )

    def _create_variables(self, allocations, rooms, days, slots_per_day):
        """Create binary decision variables for all possible assignments"""
        alloc_data = allocations
        room_list = rooms

        for alloc in alloc_data:
            alloc_id = alloc["id"]
            is_lab = alloc["is_lab"]
            duration = alloc["session_duration"]

            for day in days:
                # Possible start slots (must leave room for full duration + not cross lunch)
                for slot_start in range(slots_per_day - duration + 1):
                    # Enforce classes to only start aligned with the grid boundaries
                    # (0=9:30, 2=10:30, 4=11:30, 6=12:30, 9=14:15, 11=15:15, 13=16:15)
                    if slot_start not in {0, 2, 4, 6, 9, 11, 13}:
                        continue

                    # Check if this window crosses lunch break
                    if self._crosses_lunch(slot_start, duration, day):
                        continue

                    for room in room_list:
                        room_id = room["id"]
                        key = (alloc_id, day, slot_start, room_id)
                        self._vars[key] = self.model.NewBoolVar(
                            f"x_{alloc_id}_{day}_{slot_start}_{room_id}"
                        )

        logger.info(f"Created {len(self._vars)} decision variables")

    def _crosses_lunch(self, slot_start: int, duration: int, day: int) -> bool:
        """Check if a time window overlaps with the lunch break."""
        # Lunch: slots 7-9 (13:15–14:15, 2 × 30min = slots 7,8 from 9:30 base)
        # 09:30 = slot 0, 10:00=1, 10:30=2, 11:00=3, 11:30=4, 12:00=5,
        # 12:30=6, 13:00=7, 13:30=8(LUNCH_START), 14:00=9(LUNCH), 14:30=10
        LUNCH_START_SLOT = 7   # 13:00 → adjusted for 09:30 base
        LUNCH_END_SLOT = 9     # 14:00
        slot_end = slot_start + duration
        return not (slot_end <= LUNCH_START_SLOT or slot_start >= LUNCH_END_SLOT)

    def _extract_solution(self, allocations, rooms, days, slots_per_day) -> list[dict]:
        """Extract scheduled assignments from solver solution"""
        result = []
        room_map = {r["id"]: r for r in rooms}
        alloc_map = {a["id"]: a for a in allocations}

        for (alloc_id, day, slot_start, room_id), var in self._vars.items():
            if self.solver.Value(var) == 1:
                alloc = alloc_map[alloc_id]
                room = room_map[room_id]
                duration = alloc["session_duration"]

                # Convert slot indices to actual time
                start_minutes = 9 * 60 + 30 + (slot_start * 30)  # 9:30 base
                end_minutes = start_minutes + (duration * 30)

                result.append({
                    "allocation_id": alloc_id,
                    "section_id": alloc["section_id"],
                    "subject_id": alloc["subject_id"],
                    "faculty_id": alloc["faculty_id"],
                    "room_id": room_id,
                    "day": day,
                    "slot_start": slot_start,
                    "slot_end": slot_start + duration,
                    "is_lab": alloc["is_lab"],
                    "start_time": f"{start_minutes // 60:02d}:{start_minutes % 60:02d}",
                    "end_time": f"{end_minutes // 60:02d}:{end_minutes % 60:02d}",
                    "room_number": room["number"],
                    "subject_code": alloc["subject_code"],
                    "section_name": alloc["section_name"],
                })

        return sorted(result, key=lambda x: (x["day"], x["slot_start"], x["section_id"]))
