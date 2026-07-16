"""
Management command: seed_sample_data
Populates realistic sample data for The Neotia University: rooms, departments, programs, subjects, faculty, and allocations so dashboard & analytics show rich real-time data immediately.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.core.models import Department, Program, DegreeType, Subject, SubjectType, DifficultyLevel, Room, RoomType
from apps.faculty.models import FacultyProfile
from apps.scheduling.models import AcademicYear, Semester, SemesterType, Section, SubjectAllocation
from datetime import date


class Command(BaseCommand):
    help = "Populate rich realistic sample data for TNU Timetable System"

    def handle(self, *args, **options):
        self.stdout.write("🌱 Seeding realistic sample data for TNU Timetable System...")

        # 1. Departments
        cse_dept, _ = Department.objects.get_or_create(
            code="CSE",
            defaults={
                "name": "Computer Science & Engineering",
                "description": "Department of Computer Science and Artificial Intelligence",
                "established_year": 2015,
                "is_active": True
            }
        )
        ece_dept, _ = Department.objects.get_or_create(
            code="ECE",
            defaults={
                "name": "Robotics & Electronics",
                "description": "Department of Robotics and ECE",
                "established_year": 2016,
                "is_active": True
            }
        )
        marine_dept, _ = Department.objects.get_or_create(
            code="MRE",
            defaults={
                "name": "Marine Engineering",
                "description": "Department of Marine Engineering and Nautical Sciences",
                "established_year": 2015,
                "is_active": True
            }
        )
        mgmt_dept, _ = Department.objects.get_or_create(
            code="MGT",
            defaults={
                "name": "School of Management",
                "description": "Business Administration and Management",
                "established_year": 2017,
                "is_active": True
            }
        )

        # 2. Rooms
        rooms_data = [
            ("B-101", "Smart Lecture Hall B101", "Block-B", 1, RoomType.THEORY, 60, False, True, True, 0),
            ("B-102", "Smart Lecture Hall B102", "Block-B", 1, RoomType.THEORY, 60, False, True, True, 0),
            ("B-201", "Smart Class B201", "Block-B", 2, RoomType.THEORY, 60, False, True, True, 0),
            ("B-202", "Smart Class B202", "Block-B", 2, RoomType.THEORY, 60, False, True, True, 0),
            ("B-301", "Lecture Room B301", "Block-B", 3, RoomType.THEORY, 50, False, True, False, 0),
            ("A-101", "AI & ML Lab", "Block-A", 1, RoomType.LAB, 40, True, True, True, 40),
            ("A-102", "Advanced Computing Lab", "Block-A", 1, RoomType.LAB, 40, True, True, True, 40),
            ("A-201", "Robotics & Automation Lab", "Block-A", 2, RoomType.LAB, 35, True, True, True, 20),
            ("C-101", "Marine Simulator Lab", "Block-C", 1, RoomType.LAB, 30, True, True, True, 15),
            ("S-101", "Seminar Hall 1", "Block-S", 1, RoomType.SEMINAR, 120, False, True, True, 0),
            ("S-102", "Conference Room", "Block-S", 1, RoomType.SEMINAR, 40, False, True, True, 0),
            ("B-401", "Tutorial Room 1", "Block-B", 4, RoomType.THEORY, 30, False, False, False, 0),
        ]
        for num, name, block, floor, rtype, cap, has_comp, has_proj, has_sb, ccount in rooms_data:
            Room.objects.get_or_create(
                number=num,
                defaults={
                    "name": name,
                    "block": block,
                    "floor": floor,
                    "room_type": rtype,
                    "capacity": cap,
                    "has_computers": has_comp,
                    "has_projector": has_proj,
                    "has_smart_board": has_sb,
                    "computer_count": ccount,
                    "is_active": True
                }
            )

        # 3. Programs
        btech_cse, _ = Program.objects.get_or_create(
            code="BTECH-CSE",
            defaults={
                "name": "B.Tech in Computer Science & Engineering (AI & ML)",
                "department": cse_dept,
                "degree_type": DegreeType.BTECH,
                "duration_years": 4,
                "total_semesters": 8,
                "max_students_per_section": 60,
                "is_active": True
            }
        )
        btech_rob, _ = Program.objects.get_or_create(
            code="BTECH-ROB",
            defaults={
                "name": "B.Tech in Robotics & Automation",
                "department": ece_dept,
                "degree_type": DegreeType.BTECH,
                "duration_years": 4,
                "total_semesters": 8,
                "max_students_per_section": 60,
                "is_active": True
            }
        )
        btech_mar, _ = Program.objects.get_or_create(
            code="BTECH-MAR",
            defaults={
                "name": "B.Tech in Marine Engineering",
                "department": marine_dept,
                "degree_type": DegreeType.BTECH,
                "duration_years": 4,
                "total_semesters": 8,
                "max_students_per_section": 50,
                "is_active": True
            }
        )

        # 4. Academic Year & Semester
        ay, _ = AcademicYear.objects.get_or_create(
            label="2026-2027",
            defaults={
                "year_start": 2026,
                "year_end": 2027,
                "is_current": True
            }
        )
        sem, _ = Semester.objects.get_or_create(
            name="Odd Semester 2026",
            academic_year=ay,
            defaults={
                "semester_type": SemesterType.ODD,
                "start_date": date(2026, 7, 15),
                "end_date": date(2026, 12, 15),
                "is_current": True,
                "is_locked": False
            }
        )

        # 5. Subjects for Semester 3
        subjects_data = [
            ("CS301", "Data Structures & Algorithms", btech_cse, 3, SubjectType.THEORY, 4, 0),
            ("CS302", "Database Management Systems", btech_cse, 3, SubjectType.THEORY, 3, 0),
            ("CS303", "Computer Networks", btech_cse, 3, SubjectType.THEORY, 3, 0),
            ("CS304", "Operating Systems", btech_cse, 3, SubjectType.THEORY, 3, 0),
            ("CS391", "Data Structures & Algorithms Lab", btech_cse, 3, SubjectType.LAB, 3, 1),
            ("CS392", "Database Management Systems Lab", btech_cse, 3, SubjectType.LAB, 3, 1),
            ("RB301", "Microprocessors & Microcontrollers", btech_rob, 3, SubjectType.THEORY, 4, 0),
            ("RB302", "Control Systems Engineering", btech_rob, 3, SubjectType.THEORY, 3, 0),
            ("RB391", "Robotics & Microcontrollers Lab", btech_rob, 3, SubjectType.LAB, 3, 1),
            ("ME301", "Marine Thermodynamics", btech_mar, 3, SubjectType.THEORY, 4, 0),
            ("ME302", "Ship Structure & Construction", btech_mar, 3, SubjectType.THEORY, 3, 0),
            ("ME391", "Marine Simulator & Engine Lab", btech_mar, 3, SubjectType.LAB, 3, 1),
        ]
        created_subjects = []
        for code, name, prog, snum, stype, wh, lh in subjects_data:
            s, _ = Subject.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "program": prog,
                    "semester_number": snum,
                    "subject_type": stype,
                    "weekly_hours": wh,
                    "lab_hours_per_week": lh,
                    "is_active": True
                }
            )
            created_subjects.append(s)

        # 6. Sections
        sec_cse, _ = Section.objects.get_or_create(
            name="CSE-3A",
            program=btech_cse,
            semester=sem,
            semester_number=3,
            defaults={"max_students": 60, "current_strength": 58, "is_active": True}
        )
        sec_rob, _ = Section.objects.get_or_create(
            name="ROB-3A",
            program=btech_rob,
            semester=sem,
            semester_number=3,
            defaults={"max_students": 60, "current_strength": 45, "is_active": True}
        )
        sec_mar, _ = Section.objects.get_or_create(
            name="MAR-3A",
            program=btech_mar,
            semester=sem,
            semester_number=3,
            defaults={"max_students": 50, "current_strength": 42, "is_active": True}
        )

        # 7. Faculty Members
        User = get_user_model()
        from apps.authentication.models import UserRole
        faculties = [
            ("dr.sharma", "Dr. Rajesh", "Sharma", cse_dept, "FAC001", "Professor"),
            ("prof.gupta", "Prof. Sneha", "Gupta", cse_dept, "FAC002", "Associate Professor"),
            ("dr.verma", "Dr. Amit", "Verma", ece_dept, "FAC003", "Professor"),
            ("prof.das", "Prof. Ananya", "Das", ece_dept, "FAC004", "Assistant Professor"),
            ("dr.nair", "Dr. Vikram", "Nair", marine_dept, "FAC005", "Professor"),
        ]
        created_faculties = []
        for uname, fname, lname, dept, emp_id, desig in faculties:
            u, _ = User.objects.get_or_create(
                username=uname,
                defaults={
                    "email": f"{uname}@neotiauniversity.edu.in",
                    "first_name": fname,
                    "last_name": lname,
                    "role": UserRole.FACULTY,
                    "is_verified": True
                }
            )
            if not u.password:
                u.set_password("Faculty@TNU2026")
                u.save()

            fp, _ = FacultyProfile.objects.get_or_create(
                user=u,
                defaults={
                    "employee_id": emp_id,
                    "department": dept,
                    "designation": desig,
                    "max_weekly_hours": 16,
                    "is_active": True
                }
            )
            created_faculties.append(fp)

        # 8. Subject Allocations
        allocations_data = [
            ("CS301", created_faculties[0], sec_cse, 4),
            ("CS302", created_faculties[1], sec_cse, 3),
            ("CS303", created_faculties[0], sec_cse, 3),
            ("CS304", created_faculties[1], sec_cse, 3),
            ("CS391", created_faculties[0], sec_cse, 3),
            ("CS392", created_faculties[1], sec_cse, 3),
            ("RB301", created_faculties[2], sec_rob, 4),
            ("RB302", created_faculties[3], sec_rob, 3),
            ("RB391", created_faculties[2], sec_rob, 3),
            ("ME301", created_faculties[4], sec_mar, 4),
            ("ME302", created_faculties[4], sec_mar, 3),
            ("ME391", created_faculties[4], sec_mar, 3),
        ]
        for scode, fac, sec, wh in allocations_data:
            sub = Subject.objects.filter(code=scode).first()
            if sub:
                SubjectAllocation.objects.get_or_create(
                    subject=sub,
                    section=sec,
                    semester=sem,
                    defaults={
                        "faculty": fac,
                        "weekly_hours_override": wh,
                        "is_active": True
                    }
                )

        self.stdout.write(self.style.SUCCESS("✅ Realistic sample data seeded successfully! You can check the live analytics now."))
