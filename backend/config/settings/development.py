"""Django settings — Development overrides"""
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
