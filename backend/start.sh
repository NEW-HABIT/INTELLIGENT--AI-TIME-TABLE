#!/usr/bin/env bash
# start.sh — runs migrations and starts the server in production
set -o errexit

export DJANGO_SETTINGS_MODULE=config.settings.production

python manage.py migrate
python manage.py create_initial_data

# Start Celery Worker in the background (to run on Free Tier)
celery -A config.celery worker -l info -c 1 -Q scheduling,celery &

# Start Celery Beat in the background (to run on Free Tier)
celery -A config.celery beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler --max-interval 60 &

uvicorn config.asgi:application --host 0.0.0.0 --port $PORT
