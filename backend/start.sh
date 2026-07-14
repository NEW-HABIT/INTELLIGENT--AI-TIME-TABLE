#!/usr/bin/env bash
# start.sh — runs migrations and starts the server in production
set -o errexit

python manage.py migrate
python manage.py create_initial_data
uvicorn config.asgi:application --host 0.0.0.0 --port $PORT
