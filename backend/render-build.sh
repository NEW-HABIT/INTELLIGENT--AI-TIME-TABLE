#!/usr/bin/env bash
# render-build.sh — runs during Render build phase
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate
python -X utf8 manage.py create_initial_data
