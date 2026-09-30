from __future__ import annotations

from datetime import datetime

import httpx
import polars as pl

from data.base import MarketDataAdapter
from engine.schema import EventType, MarketStatus, Outcome, Venue


KALSHI_PUBLIC = "https://api.elections.kalshi.com/trade-api/v2"


class KalshiAdapter(MarketDataAdapter):
    venue = Venue.KALSHI

    def __init__(self, base_url: str = KALSHI_PUBLIC):
        self.base_url = base_url.rstrip("/")

    def list_instruments(self, query: str | None = None, limit: int = 20) -> list[dict]:
        params: dict = {"limit": limit, "status": "open"}
        if query:
            params["series_ticker"] = query
        try:
            with httpx.Client(timeout=20.0) as client:
                resp = client.get(f"{self.base_url}/markets", params=params)
                resp.raise_for_status()
                payload = resp.json()
        except Exception:
            return []
        markets = payload.get("markets", []) if isinstance(payload, dict) else payload
        out = []
        for m in markets:
            out.append(
                {
                    "venue": self.venue.value,
                    "market_id": m.get("ticker") or m.get("market_ticker"),
                    "ticker": m.get("ticker"),
                    "event_id": m.get("event_ticker"),
                    "title": m.get("title") or m.get("subtitle") or "",
                    "status": m.get("status"),
                    "yes_bid": m.get("yes_bid"),
                    "yes_ask": m.get("yes_ask"),
                    "volume": m.get("volume"),
                    "expiration": m.get("close_time") or m.get("expiration_time"),
                    "category": m.get("category"),
                }
            )
        return out

    def download(
        self,
        instrument: str,
        start: datetime | None = None,
        end: datetime | None = None,
        timeframe: str = "event",
    ) -> pl.DataFrame:
        """Public snapshot + history if the venue exposes it.

        Kalshi historical candlesticks require auth on some paths. We never
        fabricate missing history; callers should use ingested Parquet.
        """
        try:
            with httpx.Client(timeout=20.0) as client:
                resp = client.get(f"{self.base_url}/markets/{instrument}")
                resp.raise_for_status()
                market = resp.json().get("market", resp.json())
        except Exception as exc:
            raise RuntimeError(f"Kalshi download failed for {instrument}: {exc}") from exc
        raw = pl.DataFrame([market])
        return self.normalize(raw)

    def normalize(self, raw: pl.DataFrame) -> pl.DataFrame:
        if raw.is_empty():
            return raw
        rows = []
        for i, m in enumerate(raw.iter_rows(named=True)):
            ticker = str(m.get("ticker") or m.get("market_id") or "")
            ts = _parse_ts(m.get("updated_time") or m.get("open_time") or m.get("timestamp"))
            yes = _prob(m.get("yes_bid"), m.get("last_price"), m.get("yes_ask"), m.get("price"))
            bid = _prob(m.get("yes_bid"))
            ask = _prob(m.get("yes_ask"))
            rows.append(
                {
                    "timestamp": ts,
                    "venue": self.venue.value,
                    "market_id": ticker,
                    "event_type": EventType.QUOTE.value,
                    "outcome": Outcome.YES.value,
                    "side": None,
                    "price": yes,
                    "quantity": _f(m.get("volume")),
                    "bid": bid,
                    "ask": ask,
                    "open": None,
                    "high": None,
                    "low": None,
                    "close": yes,
                    "volume": _f(m.get("volume")),
                    "sequence": i,
                    "status": _status(m.get("status")),
                    "expiration": _parse_ts(m.get("close_time") or m.get("expiration_time") or m.get("expiration")),
                    "resolution": m.get("result") or m.get("resolution"),
                }
            )
        return pl.DataFrame(rows)


def _prob(*vals) -> float | None:
    for v in vals:
        if v is None or v == "":
            continue
        x = float(v)
        # Kalshi often quotes cents 0-100
        if x > 1.5:
            x = x / 100.0
        if 0 <= x <= 1:
            return x
    return None


def _f(v) -> float | None:
    if v is None or v == "":
        return None
    return float(v)


def _parse_ts(v) -> datetime | None:
    if v is None:
        return datetime.utcnow()
    if isinstance(v, datetime):
        return v.replace(tzinfo=None)
    if isinstance(v, (int, float)):
        if v > 1e12:
            return datetime.utcfromtimestamp(v / 1000)
        return datetime.utcfromtimestamp(v)
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return datetime.utcnow()


def _status(v) -> str:
    if not v:
        return MarketStatus.UNKNOWN.value
    s = str(v).lower()
    mapping = {
        "open": MarketStatus.TRADING.value,
        "active": MarketStatus.TRADING.value,
        "initialized": MarketStatus.OPEN.value,
        "closed": MarketStatus.EXPIRED.value,
        "settled": MarketStatus.RESOLVED.value,
        "determined": MarketStatus.RESOLVED.value,
    }
    return mapping.get(s, MarketStatus.UNKNOWN.value)
