"""Views for the exports app"""
import logging
from django.http import HttpResponse
from django.template.loader import render_to_string
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError):
    WEASYPRINT_AVAILABLE = False
    class HTML:
        def __init__(self, *args, **kwargs):
            pass
        def write_pdf(self, *args, **kwargs):
            raise ImportError("WeasyPrint / GTK libraries are not installed on this system. PDF generation is unavailable.")

from apps.authentication.permissions import IsStudent
from apps.students.models import StudentProfile, StudentEnrollment
from apps.scheduling.models import TimetableGeneration, TimetableSlot
from apps.core.models import TimeSlot

logger = logging.getLogger("apps.exports.views")


class StudentSchedulePDFView(APIView):
    """Generates a PDF weekly timetable for the current student"""
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request, *args, **kwargs):
        try:
            profile = request.user.student_profile
        except StudentProfile.DoesNotExist:
            return HttpResponse("Student profile not found", status=404)

        enrollment = StudentEnrollment.objects.filter(student=profile, is_active=True).first()
        if not enrollment:
            return HttpResponse("Active enrollment not found. Please contact the administrator.", status=404)

        section = enrollment.section

        active_gen = TimetableGeneration.objects.filter(is_active=True).first()
        if not active_gen:
            return HttpResponse("No active timetable generated yet.", status=404)

        # Get all slots for this section in the active generation
        slots = (
            TimetableSlot.objects.filter(generation=active_gen, allocation__section=section)
            .select_related("allocation__subject", "allocation__faculty__user", "room")
            .prefetch_related("time_slots")
        )

        days = [
            (0, "Monday"),
            (1, "Tuesday"),
            (2, "Wednesday"),
            (3, "Thursday"),
            (4, "Friday"),
            (5, "Saturday"),
        ]

        # Get all active time slots ordered by slot_number
        time_slots = TimeSlot.objects.filter(is_active=True).order_by("slot_number")

        # Deduplicate timeslots by start_time & end_time (since they are created per day in the database)
        unique_timeslots = []
        seen_times = set()
        for ts in time_slots:
            time_key = (ts.start_time, ts.end_time, ts.slot_type)
            if time_key not in seen_times:
                seen_times.add(time_key)
                unique_timeslots.append(ts)

        # Sort the unique timeslots by start_time
        unique_timeslots.sort(key=lambda x: x.start_time)

        # Construct rows for the timetable grid
        rows = []
        for ts in unique_timeslots:
            row = {
                "time_label": f"{ts.start_time.strftime('%H:%M')} - {ts.end_time.strftime('%H:%M')}",
                "slot_type": ts.slot_type,
                "days": [],
            }

            if ts.slot_type != "LUNCH":
                for day_idx, _ in days:
                    # Find if there is a slot scheduled on this day during this time interval
                    # Check if the slot day matches, and if any of its time_slots match start/end times
                    matching_slot = None
                    for slot in slots:
                        if slot.day == day_idx:
                            # Check if any of the slot's time_slots has the same start/end time
                            if slot.time_slots.filter(start_time=ts.start_time, end_time=ts.end_time).exists():
                                matching_slot = slot
                                break
                    row["days"].append(matching_slot)

            rows.append(row)

        context = {
            "student": profile,
            "section": section,
            "enrollment": enrollment,
            "days": days,
            "rows": rows,
        }

        try:
            # Render HTML to string
            html_content = render_to_string("exports/student_schedule.html", context)

            # Generate PDF via WeasyPrint
            pdf_file = HTML(string=html_content).write_pdf()

            # Return response
            response = HttpResponse(pdf_file, content_type="application/pdf")
            response["Content-Disposition"] = 'attachment; filename="my-timetable.pdf"'
            return response

        except Exception as e:
            logger.exception("Failed to generate schedule PDF")
            return HttpResponse(f"Error generating PDF: {str(e)}", status=500)
