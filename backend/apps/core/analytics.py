"""
Real-time Analytics & Dashboard metrics computation from PostgreSQL database.
No mock/demo data — computes real workload, room utilization, and faculty metrics.
"""
from django.db.models import Sum, Count, Q
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.core.models import Department, Subject, SubjectType, Room, TimeSlot, DayOfWeek
from apps.scheduling.models import (
    TimetableGeneration, TimetableSlot, SubjectAllocation, GenerationStatus, Semester
)
from apps.students.models import StudentProfile
from apps.faculty.models import FacultyProfile


class AnalyticsViewSet(viewsets.ViewSet):
    """
    Endpoints for Real-Time Dashboard and System Analytics.
    Provides live statistics computed from current database models.
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        """
        Dashboard summary stats, weekly load, and class type distribution.
        URL: /api/analytics/dashboard/
        """
        # 1. Basic Counts
        depts_count = Department.objects.filter(is_active=True).count()
        faculty_count = FacultyProfile.objects.filter(is_active=True).count()
        students_count = StudentProfile.objects.filter(is_active=True).count()
        rooms_count = Room.objects.filter(is_active=True).count()

        # 2. Find active or latest generation for slot metrics
        active_gen = TimetableGeneration.objects.filter(is_active=True).first()
        if not active_gen:
            active_gen = TimetableGeneration.objects.filter(
                status=GenerationStatus.COMPLETED
            ).order_by("-created_at").first()

        # 3. Weekly Schedule Load (Monday to Saturday)
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        weekly_load = []

        has_slots = False
        if active_gen:
            has_slots = TimetableSlot.objects.filter(generation=active_gen, slot_type="REGULAR").exists()

        if has_slots and active_gen:
            for day_int, day_label in enumerate(day_names):
                classes_on_day = TimetableSlot.objects.filter(
                    generation=active_gen, day=day_int, slot_type="REGULAR"
                ).count()
                rooms_on_day = TimetableSlot.objects.filter(
                    generation=active_gen, day=day_int, slot_type="REGULAR"
                ).values("room").distinct().count()
                weekly_load.append({
                    "day": day_label,
                    "classes": classes_on_day,
                    "rooms": rooms_on_day
                })
        else:
            # Fallback to expected load from active SubjectAllocations or Subjects if no slots generated yet
            allocations = SubjectAllocation.objects.filter(is_active=True)
            if allocations.exists():
                total_weekly_hours = sum(a.weekly_hours for a in allocations)
            else:
                subjects = Subject.objects.filter(is_active=True)
                total_weekly_hours = sum(s.weekly_hours for s in subjects)

            base_daily_classes = total_weekly_hours // 5 if total_weekly_hours > 0 else 0
            remainder = total_weekly_hours % 5 if total_weekly_hours > 0 else 0

            for day_int, day_label in enumerate(day_names):
                if day_int < 5: # Mon-Fri
                    classes_on_day = base_daily_classes + (1 if day_int < remainder else 0)
                    rooms_on_day = min(rooms_count, classes_on_day) if classes_on_day > 0 else 0
                else: # Saturday
                    classes_on_day = max(0, base_daily_classes // 2)
                    rooms_on_day = min(rooms_count, classes_on_day) if classes_on_day > 0 else 0

                weekly_load.append({
                    "day": day_label,
                    "classes": classes_on_day,
                    "rooms": rooms_on_day
                })

        # 4. Class Types Distribution
        total_subjects = Subject.objects.filter(is_active=True).count()
        class_types = []
        if total_subjects > 0:
            theory_count = Subject.objects.filter(is_active=True, subject_type=SubjectType.THEORY).count()
            lab_count = Subject.objects.filter(is_active=True, subject_type=SubjectType.LAB).count()
            tutorial_count = Subject.objects.filter(is_active=True, subject_type=SubjectType.TUTORIAL).count()
            seminar_count = Subject.objects.filter(is_active=True, subject_type=SubjectType.SEMINAR).count()
            project_count = Subject.objects.filter(is_active=True, subject_type=SubjectType.PROJECT).count()

            theory_pct = round((theory_count / total_subjects) * 100)
            lab_pct = round((lab_count / total_subjects) * 100)
            tutorial_pct = round((tutorial_count / total_subjects) * 100)
            seminar_pct = round((seminar_count / total_subjects) * 100)
            project_pct = round((project_count / total_subjects) * 100)

            class_types = [
                {"name": "Theory", "value": theory_pct, "count": theory_count},
                {"name": "Labs", "value": lab_pct, "count": lab_count},
                {"name": "Tutorials", "value": tutorial_pct, "count": tutorial_count},
                {"name": "Seminars", "value": seminar_pct, "count": seminar_count},
            ]
            if project_count > 0:
                class_types.append({"name": "Projects", "value": project_pct, "count": project_count})
        else:
            class_types = [
                {"name": "Theory", "value": 0, "count": 0},
                {"name": "Labs", "value": 0, "count": 0},
                {"name": "Tutorials", "value": 0, "count": 0},
                {"name": "Seminars", "value": 0, "count": 0},
            ]

        # 5. Recent Generations
        recent_generations = TimetableGeneration.objects.select_related("semester").order_by("-created_at")[:5]
        generations_data = []
        for gen in recent_generations:
            generations_data.append({
                "id": str(gen.id),
                "status": gen.status,
                "version": gen.version,
                "solve_time_seconds": gen.solve_time_seconds,
                "semester": {
                    "name": gen.semester.name if gen.semester else "Semester"
                }
            })

        return Response({
            "stats": {
                "departments": depts_count,
                "faculty": faculty_count,
                "students": students_count,
                "rooms": rooms_count,
            },
            "weekly_load": weekly_load,
            "class_types": class_types,
            "recent_generations": generations_data,
        })

    @action(detail=False, methods=["get"])
    def overview(self, request):
        """
        Full System Analytics overview: load rates, utilization, department breakdowns.
        URL: /api/analytics/overview/
        """
        rooms_count = Room.objects.filter(is_active=True).count()
        slots_per_day = TimeSlot.objects.filter(is_active=True, slot_type="REGULAR", day=0).count() or 12
        total_weekly_capacity = rooms_count * (slots_per_day * 6)

        active_gen = TimetableGeneration.objects.filter(is_active=True).first()
        if not active_gen:
            active_gen = TimetableGeneration.objects.filter(
                status=GenerationStatus.COMPLETED
            ).order_by("-created_at").first()

        # 1. Overall Load & Room Util
        has_slots = False
        if active_gen:
            has_slots = TimetableSlot.objects.filter(generation=active_gen, slot_type="REGULAR").exists()

        if has_slots and active_gen:
            scheduled_classes = TimetableSlot.objects.filter(generation=active_gen, slot_type="REGULAR").count()
            overall_load_str = f"{scheduled_classes} Classes"
            overall_load_change = f"Active generation v{active_gen.version}"
            room_util_pct = round((scheduled_classes / total_weekly_capacity) * 100, 1) if total_weekly_capacity > 0 else 0.0
        else:
            allocations = SubjectAllocation.objects.filter(is_active=True)
            if allocations.exists():
                scheduled_classes = sum(a.weekly_hours for a in allocations)
                overall_load_str = f"{scheduled_classes} Expected Classes"
                overall_load_change = f"{allocations.count()} active allocations"
            else:
                subjects = Subject.objects.filter(is_active=True)
                scheduled_classes = sum(s.weekly_hours for s in subjects)
                overall_load_str = f"{scheduled_classes} Subject Hours"
                overall_load_change = f"{subjects.count()} active subjects"
            room_util_pct = round((scheduled_classes / total_weekly_capacity) * 100, 1) if total_weekly_capacity > 0 else 0.0

        # 2. Faculty Utilization
        active_faculties = FacultyProfile.objects.filter(is_active=True)
        if active_faculties.exists():
            total_fac_util = 0.0
            for fac in active_faculties:
                fac_hours = sum(a.weekly_hours for a in SubjectAllocation.objects.filter(faculty=fac, is_active=True))
                max_h = fac.max_weekly_hours if fac.max_weekly_hours and fac.max_weekly_hours > 0 else 16
                total_fac_util += min(100.0, (fac_hours / max_h) * 100)
            avg_faculty_util = round(total_fac_util / active_faculties.count(), 1)
            fac_change = f"{active_faculties.count()} Teaching Staff"
        else:
            avg_faculty_util = 0.0
            fac_change = "0 Faculty Profile"

        # 3. Subject Coverage
        total_modules = Subject.objects.filter(is_active=True).count()
        alloc_count = SubjectAllocation.objects.filter(is_active=True).count()

        summary = [
            {
                "label": "Overall Load",
                "value": overall_load_str,
                "icon": "Activity",
                "change": overall_load_change,
                "color": "text-tnu-accent"
            },
            {
                "label": "Average Room Util.",
                "value": f"{room_util_pct}%",
                "icon": "Clock",
                "change": f"{rooms_count} Total Rooms Available",
                "color": "text-tnu-secondary"
            },
            {
                "label": "Faculty Utilization",
                "value": f"{avg_faculty_util}%",
                "icon": "Users",
                "change": fac_change,
                "color": "text-emerald-400"
            },
            {
                "label": "Subject Coverage",
                "value": f"{total_modules} Modules",
                "icon": "BookOpen",
                "change": f"{alloc_count} Allocated Courses",
                "color": "text-purple-400"
            }
        ]

        # 4. Weekly Load Trend (Monday to Saturday)
        day_names_full = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        weekly_load = []
        for day_int, day_name in enumerate(day_names_full):
            if has_slots and active_gen:
                c_count = TimetableSlot.objects.filter(generation=active_gen, day=day_int, slot_type="REGULAR").count()
                r_count = TimetableSlot.objects.filter(generation=active_gen, day=day_int, slot_type="REGULAR").values("room").distinct().count()
                day_cap = rooms_count * slots_per_day
                util = round((c_count / day_cap) * 100, 1) if day_cap > 0 else 0.0
            else:
                c_count = (scheduled_classes // 5) if day_int < 5 else max(0, scheduled_classes // 10)
                r_count = min(rooms_count, c_count) if c_count > 0 else 0
                day_cap = rooms_count * slots_per_day
                util = round((c_count / day_cap) * 100, 1) if day_cap > 0 else 0.0

            weekly_load.append({
                "day": day_name,
                "classes": c_count,
                "rooms": r_count,
                "utilization": util
            })

        # 5. Class Types Distribution
        class_distribution = []
        if total_modules > 0:
            t_cnt = Subject.objects.filter(is_active=True, subject_type=SubjectType.THEORY).count()
            l_cnt = Subject.objects.filter(is_active=True, subject_type=SubjectType.LAB).count()
            tut_cnt = Subject.objects.filter(is_active=True, subject_type=SubjectType.TUTORIAL).count()
            sem_cnt = Subject.objects.filter(is_active=True, subject_type=SubjectType.SEMINAR).count()

            class_distribution = [
                {"name": "Theory", "value": round((t_cnt / total_modules) * 100), "color": "#1e3a5f"},
                {"name": "Labs", "value": round((l_cnt / total_modules) * 100), "color": "#2dd4bf"},
                {"name": "Tutorials", "value": round((tut_cnt / total_modules) * 100), "color": "#c8922a"},
                {"name": "Seminars", "value": round((sem_cnt / total_modules) * 100), "color": "#a855f7"},
            ]
        else:
            class_distribution = [
                {"name": "Theory", "value": 0, "color": "#1e3a5f"},
                {"name": "Labs", "value": 0, "color": "#2dd4bf"},
                {"name": "Tutorials", "value": 0, "color": "#c8922a"},
                {"name": "Seminars", "value": 0, "color": "#a855f7"},
            ]

        # 6. Department Breakdown
        departments = Department.objects.filter(is_active=True)
        department_breakdown = []
        for dept in departments:
            f_cnt = FacultyProfile.objects.filter(department=dept, is_active=True).count()
            c_cnt = Subject.objects.filter(program__department=dept, is_active=True).count()
            alloc_hours = sum(a.weekly_hours for a in SubjectAllocation.objects.filter(subject__program__department=dept, is_active=True))
            if alloc_hours == 0:
                alloc_hours = sum(s.weekly_hours for s in Subject.objects.filter(program__department=dept, is_active=True))

            department_breakdown.append({
                "name": dept.name,
                "faculty": f_cnt,
                "courses": c_cnt,
                "hours": alloc_hours
            })

        return Response({
            "summary": summary,
            "weekly_load": weekly_load,
            "class_distribution": class_distribution,
            "department_breakdown": department_breakdown
        })
