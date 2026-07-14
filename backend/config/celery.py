"""Celery application configuration"""
import os
from celery import Celery
from celery.signals import setup_logging

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("tnu_timetable")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Task routing — heavy scheduling tasks go to dedicated queue
app.conf.task_routes = {
    "apps.scheduling.tasks.*": {"queue": "scheduling"},
    "apps.exports.tasks.*": {"queue": "default"},
    "apps.ai_assistant.tasks.*": {"queue": "default"},
}

app.conf.beat_schedule = {
    # Clean up old completed timetable generation jobs every day
    "cleanup-old-generations": {
        "task": "apps.scheduling.tasks.cleanup_old_generations",
        "schedule": 86400,  # daily
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
