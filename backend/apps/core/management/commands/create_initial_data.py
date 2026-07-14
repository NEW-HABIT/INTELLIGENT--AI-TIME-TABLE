"""
Management command: create_initial_data
Creates default time slots, an admin user, and initial university setup.
Run automatically on first container start.
"""
import time
from django.core.management.base import BaseCommand
from django.db import connection
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Create initial data: time slots, admin user, and sample data"

    def handle(self, *args, **options):
        self.stdout.write("🎓 Setting up The Neotia University Timetable System...")
        self._create_time_slots()
        self._create_admin_user()
        self.stdout.write(self.style.SUCCESS("✅ Initial setup complete!"))

    def _create_time_slots(self):
        """Create the 14 daily time slots (9:30-16:30 with lunch break)"""
        from apps.core.models import TimeSlot, DayOfWeek, SlotType
        from datetime import time

        if TimeSlot.objects.exists():
            self.stdout.write("  ⏩ Time slots already exist, skipping...")
            return

        # Define slots: 30-min intervals from 9:30 to 16:30
        # Lunch is 13:15-14:15
        slot_defs = [
            (0,  time(9, 30),  time(10, 0),  SlotType.REGULAR, "Period 1"),
            (1,  time(10, 0),  time(10, 30), SlotType.REGULAR, "Period 2"),
            (2,  time(10, 30), time(11, 0),  SlotType.REGULAR, "Period 3"),
            (3,  time(11, 0),  time(11, 30), SlotType.REGULAR, "Period 4"),
            (4,  time(11, 30), time(12, 0),  SlotType.REGULAR, "Period 5"),
            (5,  time(12, 0),  time(12, 30), SlotType.REGULAR, "Period 6"),
            (6,  time(12, 30), time(13, 15), SlotType.REGULAR, "Period 7"),
            (7,  time(13, 15), time(13, 45), SlotType.LUNCH,   "Lunch"),
            (8,  time(13, 45), time(14, 15), SlotType.LUNCH,   "Lunch"),
            (9,  time(14, 15), time(14, 45), SlotType.REGULAR, "Period 8"),
            (10, time(14, 45), time(15, 15), SlotType.REGULAR, "Period 9"),
            (11, time(15, 15), time(15, 45), SlotType.REGULAR, "Period 10"),
            (12, time(15, 45), time(16, 15), SlotType.REGULAR, "Period 11"),
            (13, time(16, 15), time(16, 30), SlotType.REGULAR, "Period 12"),
        ]

        days = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY]

        slots = []
        for day in days:
            for slot_num, start, end, slot_type, label in slot_defs:
                slots.append(TimeSlot(
                    day=day,
                    slot_number=slot_num,
                    start_time=start,
                    end_time=end,
                    slot_type=slot_type,
                    label=label,
                ))

        TimeSlot.objects.bulk_create(slots, ignore_conflicts=True)
        self.stdout.write(f"  ✅ Created {len(slots)} time slots across 6 days")

    def _create_admin_user(self):
        """Create default admin user if none exists"""
        User = get_user_model()
        from apps.authentication.models import UserRole

        if User.objects.filter(role=UserRole.ADMIN).exists():
            self.stdout.write("  ⏩ Admin user already exists, skipping...")
            return

        admin = User.objects.create_superuser(
            email="admin@neotiauniversity.edu.in",
            username="admin",
            first_name="TNU",
            last_name="Administrator",
            password="Admin@TNU2024",
            role=UserRole.ADMIN,
            is_verified=True,
        )
        self.stdout.write(
            f"  ✅ Created admin user: admin@neotiauniversity.edu.in / Admin@TNU2024"
        )
        self.stdout.write(
            self.style.WARNING("  ⚠️  CHANGE THE DEFAULT PASSWORD IN PRODUCTION!")
        )
