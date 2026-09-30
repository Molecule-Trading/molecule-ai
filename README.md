# Molecule AI

Research and historical backtesting for crypto and prediction markets.

Venues: Binance, Kalshi, Polymarket.

Grok is the research agent. The Python engine is the source of truth for every number.

```
Natural-language idea
        → Grok (tools only)
        → StrategySpec (Pydantic DSL)
        → validation
        → Parquet / DuckDB data
        → deterministic backtest
        → execution + settlement
        → analytics / charts
        → Grok interpretation
        → saved research run
```

This repository is standalone. It is not the Molecule brokerage/OMS.

## Prerequisites

- Python 3.11+
- Node 20+
- Docker (Postgres + Redis for the full local stack; SQLite is used if `DATABASE_URL` is a sqlite URL)

## Setup

```bash
cp .env.example .env
# set XAI_API_KEY to enable the live Grok agent
# XAI_MODEL defaults to grok-4 and is read from the environment

python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

cd apps/web && npm install && cd ../..

docker compose up -d
make fixtures
```

Without `XAI_API_KEY` the API still runs. Research requests use a deterministic fallback `StrategySpec` and the same engine. Numerical results are never invented by the model.

## Run

```bash
make api    # http://localhost:8000
make web    # http://localhost:3000
make test
```

## Sample research run

UI: open `/research` and submit:

```
Test whether a 1% BTC move over 5 minutes predicts a delayed move in BTC-related prediction markets.
```

CLI:

```bash
make backtest
```

Fixture datasets under `tests/fixtures/` are labelled synthetic. The UI and API mark them as such. Do not treat fixture P&L as live performance.

## Hosted UI

`apps/web` is the Vercel project. Set the project **Root Directory** to `apps/web`.

With no API configured, the desk still loads. It shows one **recorded synthetic fixture** produced by the Python engine (`make web-fixture` → `apps/web/lib/engine-fixture.json`). Those numbers are not invented and are not a live run of the page. Submitting a different hypothesis is blocked until an API is attached. The page does not fill in P&L for a hypothesis the engine did not run.

```bash
make web-fixture

# browser talks to FastAPI directly
NEXT_PUBLIC_API_URL=https://your-api-origin
# or the Next server proxies, and the key stays off the browser
MOLECULE_API_ORIGIN=https://your-api-origin
```

Set `WEB_ORIGIN` on the API to the Vercel origin (comma-separated if you have more than one). Use `WEB_ORIGIN=*` only if any browser origin is acceptable.

Local against the API:

```bash
cd apps/web && NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

## Layout

```
apps/web          Next.js research UI
apps/api          FastAPI
engine            DSL, features, backtest, execution, settlement, analytics
data              adapters + Parquet/DuckDB catalog + quality
agents            Grok client + tool dispatcher
tests             unit, golden, schema-boundary
```

See `docs/` for the implementation notes.
