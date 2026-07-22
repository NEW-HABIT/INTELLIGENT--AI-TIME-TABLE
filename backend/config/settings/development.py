"""Django settings — Development overrides (no Docker required, uses Upstash Redis)"""
from .base import *  # noqa: F401, F403

DEBUG = True

# Relaxed security for dev
CORS_ALLOW_ALL_ORIGINS = True

# Email to console in dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Silk profiling enabled in dev
SILKY_PYTHON_PROFILER = True

# Show SQL queries
LOGGING["loggers"]["django.db.backends"] = {  # noqa: F405
    "handlers": ["console"],
    "level": "DEBUG",
    "propagate": False,
}

# Disable throttling in dev
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa: F405

# ── Celery Async Dev Mode ──────────────────────────────────────────────────
# Tasks are run asynchronously by the Celery worker. Make sure to start the
# Celery worker process with: python -m celery -A config.celery worker -l info -P solo
CELERY_TASK_ALWAYS_EAGER = False  # noqa: F405
CELERY_TASK_EAGER_PROPAGATES = False  # noqa: F405
