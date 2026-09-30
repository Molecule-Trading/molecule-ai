from __future__ import annotations

from datetime import datetime, timezone

import httpx
import polars as pl

from data.base import MarketDataAdapter
from engine.schema import EventType, Outcome, Venue


BINANCE_KLINES = "https://api.binance.com/api/v3/klines"
DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"]

INTERVAL_MAP = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
}


class BinanceAdapter(MarketDataAdapter):
    venue = Venue.BINANCE

    def __init__(self, base_url: str = "https://api.binance.com"):
        self.base_url = base_url.rstrip("/")

    def list_instruments(self) -> list[dict]:
        return [
            {
                "venue": self.venue.value,
                "symbol": s,
                "market_id": s,
                "kind": "spot",
                "quote": "USDT",
            }
            for s in DEFAULT_SYMBOLS
        ]

    def download(
        self,
        instrument: str,
        start: datetime | None = None,
        end: datetime | None = None,
        timeframe: str = "5m",
        limit: int = 1000,
    ) -> pl.DataFrame:
        interval = INTERVAL_MAP.get(timeframe, "5m")
        params: dict = {"symbol": instrument.upper(), "interval": interval, "limit": min(limit, 1000)}
        if start:
            params["startTime"] = int(start.replace(tzinfo=timezone.utc).timestamp() * 1000)
        if end:
            params["endTime"] = int(end.replace(tzinfo=timezone.utc).timestamp() * 1000)
        try:
            with httpx.Client(timeout=20.0) as client:
                resp = client.get(f"{self.base_url}/api/v3/klines", params=params)
                resp.raise_for_status()
                rows = resp.json()
        except Exception as exc:
            raise RuntimeError(f"Binance download failed for {instrument}: {exc}") from exc
        raw = pl.DataFrame(
            {
                "open_time": [r[0] for r in rows],
                "open": [float(r[1]) for r in rows],
                "high": [float(r[2]) for r in rows],
                "low": [float(r[3]) for r in rows],
                "close": [float(r[4]) for r in rows],
                "volume": [float(r[5]) for r in rows],
                "close_time": [r[6] for r in rows],
            }
        )
        return self.normalize(raw, instrument=instrument.upper())

    def normalize(self, raw: pl.DataFrame, instrument: str = "BTCUSDT") -> pl.DataFrame:
        if raw.is_empty():
            return raw
        ts_col = "open_time" if "open_time" in raw.columns else "timestamp"
        return raw.select(
            pl.from_epoch(pl.col(ts_col), time_unit="ms").alias("timestamp")
            if raw.schema[ts_col] in (pl.Int64, pl.Int32, pl.UInt64)
            else pl.col(ts_col).alias("timestamp"),
            pl.lit(self.venue.value).alias("venue"),
            pl.lit(instrument).alias("market_id"),
            pl.lit(EventType.CANDLE.value).alias("event_type"),
            pl.lit(Outcome.NA.value).alias("outcome"),
            pl.lit(None).cast(pl.String).alias("side"),
            pl.col("close").cast(pl.Float64).alias("price"),
            pl.col("volume").cast(pl.Float64).alias("quantity"),
            pl.lit(None).cast(pl.Float64).alias("bid"),
            pl.lit(None).cast(pl.Float64).alias("ask"),
            pl.col("open").cast(pl.Float64),
            pl.col("high").cast(pl.Float64),
            pl.col("low").cast(pl.Float64),
            pl.col("close").cast(pl.Float64),
            pl.col("volume").cast(pl.Float64),
            pl.int_range(0, raw.height).alias("sequence"),
            pl.lit(None).cast(pl.String).alias("status"),
            pl.lit(None).cast(pl.Datetime("us")).alias("expiration"),
            pl.lit(None).cast(pl.String).alias("resolution"),
        )
