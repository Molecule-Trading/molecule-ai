# Molecule AI

Research and historical backtesting for crypto and prediction markets.

Venues: Binance, Kalshi, Polymarket.

Grok is the research agent. The Python engine is the source of truth for every number.

This repository is standalone. It is not the Molecule brokerage/OMS.

## Setup

```bash
cp .env.example .env
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cd apps/web && npm install && cd ../..
make fixtures
make api    # localhost:8000
make web    # localhost:3000
make test
```

Set `XAI_API_KEY` and `XAI_MODEL` to enable the live Grok agent. Without the key, research still runs on a deterministic fallback StrategySpec. Numerical results always come from Python.

Fixture datasets are labelled synthetic. Do not treat fixture P&L as live performance.
