PYTHON ?= python3
PIP ?= $(PYTHON) -m pip

.PHONY: dev api web test lint typecheck ingest backtest fixtures install

install:
	$(PIP) install -e ".[dev]"
	cd apps/web && npm install

fixtures:
	$(PYTHON) -m scripts.build_fixtures

ingest: fixtures
	@echo "Fixture datasets registered under var/data"

api:
	$(PYTHON) -m uvicorn apps.api.main:app --reload --host 0.0.0.0 --port 8000

web:
	cd apps/web && npm run dev

dev:
	@echo "Start infra: docker compose up -d"
	@echo "Then: make api   (terminal 1)"
	@echo "      make web   (terminal 2)"

test:
	$(PYTHON) -m pytest -q

lint:
	$(PYTHON) -m ruff check engine data agents apps tests scripts
	cd apps/web && npm run lint

typecheck:
	cd apps/web && npx tsc --noEmit

backtest:
	$(PYTHON) -c "from apps.api.service import ResearchService; from apps.api.settings import get_settings; from agents.research.agent import fallback_spec; s=ResearchService(get_settings()); print(s.run_spec(fallback_spec('fixture run')))"
