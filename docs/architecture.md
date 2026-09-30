# Architecture

Molecule AI is a single monorepo. The Python engine is deterministic. Grok only orchestrates.

```
apps/web  →  apps/api  →  agents + engine + data
```

No extra microservices. Redis is reserved for job queues; v0.1 runs research synchronously and persists runs as JSON plus Parquet datasets.

## Boundary

Grok emits `StrategySpec` JSON. The API validates it with Pydantic before any engine call. Generated Python is never executed.

## Data path

Venue adapter → normalize to `MarketEvent` columns → quality report → Parquet file → catalog.json + DuckDB path index.

The backtest consumes a merged, time-sorted event list. Features update only after the current event is applied, so a signal at t cannot see t+1.
