# Local development

```bash
cp .env.example .env
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
docker compose up -d
make fixtures
make api
make web   # separate terminal
make test
```

Postgres and Redis are optional in v0.1. The API persists runs to `var/runs.json` and datasets to `var/data/*.parquet`. DuckDB indexes dataset paths.

`make backtest` runs the fallback strategy against fixtures without the UI.
