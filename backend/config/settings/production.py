"""Django settings — Production overrides (Render + Supabase)"""
import sentry_sdk
from decouple import config
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from .base import *  # noqa: F401, F403

DEBUG = False

# ── Security (Render terminates SSL at proxy level) ───────
# Do NOT use SECURE_SSL_REDIRECT=True — Render handles HTTPS at the edge
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = "DENY"

# ── CORS ─────────────────────────────────────────────────
# Set CORS_ALLOWED_ORIGINS env var on Render, comma-separated
CORS_ALLOW_ALL_ORIGINS = False  # be explicit in prod

# ── Static Files (WhiteNoise) ─────────────────────────────
# Already in MIDDLEWARE from base.py — WhiteNoise is at position 1
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ── Sentry ────────────────────────────────────────────────
SENTRY_DSN = config("SENTRY_DSN", default="")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment="production",
    )

# ── Silk (disable in production) ─────────────────────────
SILKY_PYTHON_PROFILER = False
MIDDLEWARE = [m for m in MIDDLEWARE if "silk" not in m]  # noqa: F405
INSTALLED_APPS = [a for a in INSTALLED_APPS if "silk" not in a]  # noqa: F405
