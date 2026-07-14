"""
Celery Tasks — Async timetable generation
"""
import logging
from celery import shared_task
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger("apps.scheduling.tasks")


def send_ws_progress(generation_id: str, progress: int, message: str, status: str = "RUNNING"):
    """Send progress update via WebSocket to the admin client"""
    channel_layer = get_channel_layer()
    group_name = f"generation_{generation_id}"
    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "generation_progress",
                "data": {
                    "generation_id": generation_id,
                    "progress": progress,
                    "message": message,
                    "status": status,
                },
            },
        )
    except Exception as e:
        logger.warning(f"WebSocket send failed: {e}")


@shared_task(
    bind=True,
    name="apps.scheduling.tasks.generate_timetable",
    queue="scheduling",
    max_retries=0,
    acks_late=True,
)
def generate_timetable(self, generation_id: str):
    """
    Main Celery task for timetable generation.
    Runs the CP-SAT solver asynchronously.
    """
    from apps.scheduling.models import TimetableGeneration, TimetableSlot, GenerationStatus
    from apps.scheduling.engine.data_loader import DataLoader
    from apps.scheduling.engine.solver import TimetableSolver
    from apps.core.models import TimeSlot, Room
    from apps.scheduling.models import SubjectAllocation

    logger.info(f"Starting timetable generation task for generation_id={generation_id}")

    try:
        generation = TimetableGeneration.objects.select_related("semester").get(id=generation_id)
    except TimetableGeneration.DoesNotExist:
        logger.error(f"TimetableGeneration {generation_id} not found")
        return {"status": "ERROR", "message": "Generation record not found"}

    # Update status to RUNNING
    generation.status = GenerationStatus.RUNNING
    generation.started_at = timezone.now()
    generation.progress_percent = 0
    generation.celery_task_id = self.request.id
    generation.save(update_fields=["status", "started_at", "progress_percent", "celery_task_id"])

    def progress_reporter(progress: int, message: str):
        """Called by solver during optimization to report progress"""
        generation.progress_percent = progress
        generation.save(update_fields=["progress_percent"])
        send_ws_progress(generation_id, progress, message)

    try:
        # Load data
        send_ws_progress(generation_id, 5, "Loading scheduling data from database...")
        loader = DataLoader(
            semester_id=str(generation.semester.id),
            config=generation.config
        )
        data = loader.load()

        # Run solver
        from django.conf import settings
        time_limit = generation.config.get(
            "time_limit", getattr(settings, "SOLVER_TIME_LIMIT_SECONDS", 300)
        )

        solver = TimetableSolver(
            data=data,
            time_limit=time_limit,
            progress_reporter=progress_reporter,
        )
        result = solver.solve()

        # Save results to DB
        if result.status in ("OPTIMAL", "FEASIBLE"):
            send_ws_progress(generation_id, 95, "Saving timetable to database...")

            # Clear old slots for this generation
            TimetableSlot.objects.filter(generation=generation, is_locked=False).delete()

            # Build time slot lookup
            all_time_slots = list(TimeSlot.objects.all().order_by("day", "slot_number"))

            # Save each scheduled slot
            slots_to_create = []
            for sched in result.timetable:
                alloc = SubjectAllocation.objects.get(id=sched["allocation_id"])
                room = Room.objects.get(id=sched["room_id"])

                slot_obj = TimetableSlot(
                    generation=generation,
                    allocation=alloc,
                    room=room,
                    day=sched["day"],
                    is_lab_block=sched["is_lab"],
                )
                slots_to_create.append((slot_obj, sched))

            # Bulk create slots
            created_slots = TimetableSlot.objects.bulk_create(
                [s for s, _ in slots_to_create]
            )

            # Assign time slots (M2M — must be done after creation)
            for slot_obj, sched in zip(created_slots, [s for _, s in slots_to_create]):
                day_ts = [ts for ts in all_time_slots if ts.day == sched["day"]]
                start = sched["slot_start"]
                end = sched["slot_end"]
                slot_day_slots = [ts for ts in day_ts if start <= ts.slot_number < end]
                slot_obj.time_slots.set(slot_day_slots)

            # Mark this generation as active
            generation.status = GenerationStatus.COMPLETED
            generation.is_active = True
            generation.solver_stats = result.solver_stats
            generation.solve_time_seconds = result.solve_time
            generation.completed_at = timezone.now()
            generation.progress_percent = 100
            generation.save()

            send_ws_progress(generation_id, 100, "✅ Timetable generated successfully!", "COMPLETED")
            logger.info(f"Generation {generation_id} completed: {len(result.timetable)} slots")

            return {
                "status": "COMPLETED",
                "generation_id": generation_id,
                "slots_count": len(result.timetable),
                "solver_stats": result.solver_stats,
            }

        else:
            # Infeasible or failed
            generation.status = GenerationStatus.INFEASIBLE
            generation.conflicts = result.conflicts
            generation.solver_stats = result.solver_stats
            generation.solve_time_seconds = result.solve_time
            generation.completed_at = timezone.now()
            generation.progress_percent = 100
            generation.save()

            send_ws_progress(
                generation_id, 100,
                f"❌ No feasible timetable found. {len(result.conflicts)} conflicts detected.",
                "INFEASIBLE"
            )
            logger.warning(f"Generation {generation_id} infeasible: {result.conflicts}")

            return {
                "status": "INFEASIBLE",
                "conflicts": result.conflicts,
                "solver_stats": result.solver_stats,
            }

    except Exception as exc:
        logger.exception(f"Timetable generation failed for {generation_id}: {exc}")
        generation.status = GenerationStatus.FAILED
        generation.completed_at = timezone.now()
        generation.solver_stats = {"error": str(exc)}
        generation.save(update_fields=["status", "completed_at", "solver_stats"])
        send_ws_progress(generation_id, 0, f"❌ Error: {str(exc)}", "FAILED")
        raise


@shared_task(name="apps.scheduling.tasks.cleanup_old_generations")
def cleanup_old_generations():
    """Remove non-active generations older than 30 days"""
    from apps.scheduling.models import TimetableGeneration
    from django.utils import timezone
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(days=30)
    deleted, _ = TimetableGeneration.objects.filter(
        is_active=False,
        created_at__lt=cutoff
    ).delete()
    logger.info(f"Cleaned up {deleted} old timetable generations")
    return {"deleted": deleted}
