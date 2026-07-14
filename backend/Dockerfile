# ─────────────────────────────────────────────────────────
# Backend Dockerfile — Multi-stage for production efficiency
# ─────────────────────────────────────────────────────────

FROM python:3.12-slim AS base

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python env
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ─────────────────────────────────────────────────────────
# Development stage
# ─────────────────────────────────────────────────────────
FROM base AS development

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

# ─────────────────────────────────────────────────────────
# Production stage
# ─────────────────────────────────────────────────────────
FROM base AS production

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DJANGO_SECRET_KEY=dummy_key_for_collectstatic
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120"]
