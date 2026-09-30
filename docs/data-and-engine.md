# Data, engine, settlement

## Adapters

`MarketDataAdapter` implementations live under `data/{binance,kalshi,polymarket}`. They talk to public endpoints only. Missing historical fields are left null.

## Quality

`data.quality.assess_quality` flags gaps, duplicates, non-positive prices, negative size, crossed markets, and missing settlement. Nothing is silently repaired.

## Execution

Market fills use ask on buys and bid on sells when quotes exist, plus configurable bps slippage and latency. Queue reconstruction is out of scope for v0.1. Assumptions are attached to every result.

## Prediction markets

YES is treated as implied probability. Settlement pays $1 to the resolved outcome and $0 to the other. Unresolved markets produce a warning and leave the position open. The engine never guesses a winner.

## Reproducibility

A run stores strategy fingerprint, dataset ids / checksums / versions, engine version, and execution assumptions. Golden tests in `tests/test_backtest_golden.py` require identical P&L on repeated runs against fixtures.
