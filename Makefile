# ═══════════════════════════════════════════════════════
#  The Neotia University — Timetable System
#  Makefile — Developer convenience commands
# ═══════════════════════════════════════════════════════

.PHONY: help build up down restart logs shell migrate makemigrations test clean superuser

# Default target
help:
	@echo ""
	@echo "  🎓 The Neotia University — Timetable System"
	@echo "  ═══════════════════════════════════════════"
	@echo ""
	@echo "  Infrastructure:"
	@echo "    make build          Build all Docker images"
	@echo "    make up             Start all services (detached)"
	@echo "    make down           Stop all services"
	@echo "    make restart        Restart all services"
	@echo "    make logs           Tail all service logs"
	@echo "    make logs-backend   Tail backend logs only"
	@echo "    make logs-celery    Tail celery worker logs"
	@echo "    make clean          Remove containers, volumes, images"
	@echo ""
	@echo "  Django:"
	@echo "    make shell          Open Django shell"
	@echo "    make migrate        Apply migrations"
	@echo "    make makemigrations Create new migrations"
	@echo "    make superuser      Create admin superuser"
	@echo "    make seed           Load sample/demo data"
	@echo "    make collectstatic  Collect static files"
	@echo ""
	@echo "  Testing:"
	@echo "    make test           Run all tests"
	@echo "    make test-cov       Run tests with coverage report"
	@echo "    make lint           Run ruff linter"
	@echo ""
	@echo "  Frontend:"
	@echo "    make fe-shell       Open Next.js container shell"
	@echo "    make fe-install     Install Node packages"
	@echo ""

# ── Build & Run ─────────────────────────────────────────
build:
	docker compose build

up:
	docker compose up -d
	@echo ""
	@echo "  ✅ Services started!"
	@echo "  🌐 Frontend:  http://localhost:3000"
	@echo "  🔧 Backend:   http://localhost:8000"
	@echo "  📊 Flower:    http://localhost:5555"
	@echo "  🔐 API Docs:  http://localhost:8000/api/schema/swagger-ui/"
	@echo ""

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-celery:
	docker compose logs -f celery_worker

# ── Django Commands ──────────────────────────────────────
shell:
	docker compose exec backend python manage.py shell_plus

migrate:
	docker compose exec backend python manage.py migrate

makemigrations:
	docker compose exec backend python manage.py makemigrations

superuser:
	docker compose exec backend python manage.py createsuperuser

seed:
	docker compose exec backend python manage.py seed_demo_data

collectstatic:
	docker compose exec backend python manage.py collectstatic --noinput

# ── Testing ──────────────────────────────────────────────
test:
	docker compose exec backend pytest tests/ -v

test-cov:
	docker compose exec backend pytest tests/ -v --cov=apps --cov-report=html --cov-report=term-missing
	@echo "Coverage report: backend/htmlcov/index.html"

lint:
	docker compose exec backend ruff check apps/
	docker compose exec backend ruff format --check apps/

# ── Frontend ─────────────────────────────────────────────
fe-shell:
	docker compose exec frontend sh

fe-install:
	docker compose exec frontend npm install

# ── Cleanup ──────────────────────────────────────────────
clean:
	docker compose down -v --rmi local
	@echo "⚠️  All containers, volumes, and local images removed."

# ── Production ───────────────────────────────────────────
prod-up:
	docker compose -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f
