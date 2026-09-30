"""Synthetic, labelled fixture datasets for golden tests and local demo.

These are NOT live market observations.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

import polars as pl

from data.catalog import DataCatalog
from engine.schema import EventType, MarketStatus, Outcome, Venue


START = datetime(2025, 1, 1, 0, 0, 0)
BARS = 120  # 10 hours of 5-minute bars
BAR = timedelta(minutes=5)


def btc_path() -> list[dict]:
    """Price path with a known +1.2% jump at bar 40 and quiet elsewhere."""
    px = 100_000.0
    rows = []
    for i in range(BARS):
        ts = START + i * BAR
        if i == 40:
            px *= 1.012
        else:
            px *= 1.00005
        o = px / 1.00005
        rows.append(
            {
                "timestamp": ts,
                "venue": Venue.BINANCE.value,
                "market_id": "BTCUSDT",
                "event_type": EventType.CANDLE.value,
                "outcome": Outcome.NA.value,
                "side": None,
                "price": px,
                "quantity": 10.0 + i * 0.01,
                "bid": px - 1.0,
                "ask": px + 1.0,
                "open": o,
                "high": px * 1.0002,
                "low": o * 0.9998,
                "close": px,
                "volume": 25.0 + i,
                "sequence": i,
                "status": None,
                "expiration": None,
                "resolution": None,
            }
        )
    return rows


def kalshi_path() -> list[dict]:
    """YES probability lags the BTC jump by 2 bars, then settles YES."""
    rows = []
    p = 0.48
    expiry = START + BARS * BAR
    for i in range(BARS):
        ts = START + i * BAR
        if i == 42:
            p = 0.67
        elif i > 42:
            p = min(0.82, p + 0.002)
        rows.append(
            {
                "timestamp": ts,
                "venue": Venue.KALSHI.value,
                "market_id": "BTC-MOVE-FIXTURE",
                "event_type": EventType.QUOTE.value,
                "outcome": Outcome.YES.value,
                "side": None,
                "price": p,
                "quantity": 100.0,
                "bid": max(0.01, p - 0.01),
                "ask": min(0.99, p + 0.01),
                "open": None,
                "high": None,
                "low": None,
                "close": p,
                "volume": 500.0 + i,
                "sequence": i,
                "status": MarketStatus.TRADING.value,
                "expiration": expiry,
                "resolution": None,
            }
        )
    rows.append(
        {
            "timestamp": expiry,
            "venue": Venue.KALSHI.value,
            "market_id": "BTC-MOVE-FIXTURE",
            "event_type": EventType.SETTLEMENT.value,
            "outcome": Outcome.YES.value,
            "side": None,
            "price": 1.0,
            "quantity": 0.0,
            "bid": None,
            "ask": None,
            "open": None,
            "high": None,
            "low": None,
            "close": 1.0,
            "volume": None,
            "sequence": BARS,
            "status": MarketStatus.RESOLVED.value,
            "expiration": expiry,
            "resolution": "YES",
        }
    )
    return rows


def polymarket_path() -> list[dict]:
    rows = []
    p = 0.50
    expiry = START + BARS * BAR
    for i in range(BARS):
        ts = START + i * BAR
        if i == 43:
            p = 0.64
        rows.append(
            {
                "timestamp": ts,
                "venue": Venue.POLYMARKET.value,
                "market_id": "btc-up-fixture",
                "event_type": EventType.QUOTE.value,
                "outcome": Outcome.YES.value,
                "side": None,
                "price": p,
                "quantity": 80.0,
                "bid": max(0.01, p - 0.015),
                "ask": min(0.99, p + 0.015),
                "open": None,
                "high": None,
                "low": None,
                "close": p,
                "volume": 200.0 + i,
                "sequence": i,
                "status": MarketStatus.TRADING.value,
                "expiration": expiry,
                "resolution": None,
            }
        )
    rows.append(
        {
            "timestamp": expiry,
            "venue": Venue.POLYMARKET.value,
            "market_id": "btc-up-fixture",
            "event_type": EventType.SETTLEMENT.value,
            "outcome": Outcome.YES.value,
            "side": None,
            "price": 1.0,
            "quantity": 0.0,
            "bid": None,
            "ask": None,
            "open": None,
            "high": None,
            "low": None,
            "close": 1.0,
            "volume": None,
            "sequence": BARS,
            "status": MarketStatus.RESOLVED.value,
            "expiration": expiry,
            "resolution": "YES",
        }
    )
    return rows


def _frame(rows: list[dict]) -> pl.DataFrame:
    return pl.DataFrame(rows, infer_schema_length=max(len(rows), 200))


def write_repo_fixtures(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    _frame(btc_path()).write_parquet(dest / "btc_sample.parquet")
    _frame(kalshi_path()).write_parquet(dest / "kalshi_sample.parquet")
    _frame(polymarket_path()).write_parquet(dest / "polymarket_sample.parquet")


def build_and_register(catalog: DataCatalog | None = None) -> list:
    root = Path(__file__).resolve().parents[1]
    fixtures = root / "tests" / "fixtures"
    write_repo_fixtures(fixtures)
    catalog = catalog or DataCatalog(root / "var" / "data", root / "var" / "molecule.duckdb")
    metas = []
    metas.append(
        catalog.register(
            pl.read_parquet(fixtures / "btc_sample.parquet"),
            Venue.BINANCE,
            "BTCUSDT",
            "5m",
            source="fixture",
            data_version="fixture-0.1",
            synthetic=True,
        )
    )
    metas.append(
        catalog.register(
            pl.read_parquet(fixtures / "kalshi_sample.parquet"),
            Venue.KALSHI,
            "BTC-MOVE-FIXTURE",
            "5m",
            source="fixture",
            data_version="fixture-0.1",
            synthetic=True,
        )
    )
    metas.append(
        catalog.register(
            pl.read_parquet(fixtures / "polymarket_sample.parquet"),
            Venue.POLYMARKET,
            "btc-up-fixture",
            "5m",
            source="fixture",
            data_version="fixture-0.1",
            synthetic=True,
        )
    )
    return metas


if __name__ == "__main__":
    print(build_and_register())
