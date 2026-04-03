SHELL := /bin/bash
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
BACKEND := $(ROOT)/backend
export PYTHONPATH := $(ROOT)

# Repo root must be on PYTHONPATH so `backend.main` imports; uv project lives in backend/
UV_RUN_API := cd "$(ROOT)" && PYTHONPATH="$(ROOT)" uv run --project "$(BACKEND)" python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

.PHONY: dev backend frontend install install-backend install-frontend help

.DEFAULT_GOAL := dev

help:
	@echo "Targets:"
	@echo "  make dev      - FastAPI (http://127.0.0.1:8000) + Vite (http://127.0.0.1:3000)"
	@echo "  make backend  - API only (via uv)"
	@echo "  make frontend - Vite only"
	@echo "  make install  - uv sync (backend) + npm install (frontend)"

# Run both; Ctrl+C stops the API and dev server (same process group)
dev:
	@command -v uv >/dev/null 2>&1 || { echo "uv not found (https://docs.astral.sh/uv/)"; exit 1; }
	@echo "Backend http://127.0.0.1:8000  |  Frontend http://127.0.0.1:3000"
	@trap 'kill 0' EXIT INT TERM; \
		cd "$(ROOT)/frontend" && npm run dev & \
		$(UV_RUN_API) & \
		wait

backend:
	@command -v uv >/dev/null 2>&1 || { echo "uv not found (https://docs.astral.sh/uv/)"; exit 1; }
	$(UV_RUN_API)

frontend:
	cd "$(ROOT)/frontend" && npm run dev

install: install-backend install-frontend

install-backend:
	@command -v uv >/dev/null 2>&1 || { echo "uv not found (https://docs.astral.sh/uv/)"; exit 1; }
	cd "$(BACKEND)" && uv sync

install-frontend:
	cd "$(ROOT)/frontend" && npm install
