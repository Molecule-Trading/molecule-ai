from __future__ import annotations

from datetime import datetime

import httpx
import polars as pl

from data.base import MarketDataAdapter
from engine.schema import EventType, MarketStatus, Outcome, Venue


GAMMA = "https://gamma-api.polymarket.com"
CLOB = "https://clob.polymarket.com"


class PolymarketAdapter(MarketDataAdapter):
    venue = Venue.POLYMARKET

    def list_instruments(self, query: str | None = None, limit: int = 20) -> list[dict]:
        params: dict = {"limit": limit, "active": True, "closed": False}
        if query:
            params["query"] = query
        try:
            with httpx.Client(timeout=20.0) as client:
                resp = client.get(f"{GAMMA}/markets", params=params)
                resp.raise_for_status()
                markets = resp.json()
        except Exception:
            return []
        if isinstance(markets, dict):
            markets = markets.get("markets", markets.get("data", []))
        out = []
        for m in markets:
            tokens = m.get("clobTokenIds") or m.get("clob_token_ids") or []
            if isinstance(tokens, str):
                tokens = [t.strip() for t in tokens.strip("[]").replace('"', "").split(",") if t.strip()]
            outcomes = m.get("outcomes") or ["Yes", "No"]
            if isinstance(outcomes, str):
                outcomes = [o.strip() for o in outcomes.strip("[]").replace('"', "").split(",") if o.strip()]
            out.append(
                {
                    "venue": self.venue.value,
                    "market_id": m.get("id") or m.get("conditionId") or m.get("condition_id"),
                    "event_id": m.get("eventId") or m.get("events", [{}])[0].get("id") if m.get("events") else None,
                    "question": m.get("question") or m.get("title") or "",
                    "slug": m.get("slug"),
                    "outcomes": outcomes,
                    "token_ids": tokens,
                    "volume": m.get("volumeNum") or m.get("volume"),
                    "end_time": m.get("endDate") or m.get("end_date_iso"),
                    "closed": m.get("closed"),
                    "resolved": bool(m.get("umaResolutionStatus") == "resolved" or m.get("resolved")),
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
        try:
            with httpx.Client(timeout=20.0) as client:
                resp = client.get(f"{GAMMA}/markets/{instrument}")
                if resp.status_code == 404:
                    resp = client.get(f"{GAMMA}/markets", params={"id": instrument})
                resp.raise_for_status()
                payload = resp.json()
        except Exception as exc:
            raise RuntimeError(f"Polymarket download failed for {instrument}: {exc}") from exc
        if isinstance(payload, list):
            raw = pl.DataFrame(payload)
        else:
            raw = pl.DataFrame([payload])
        return self.normalize(raw)

    def normalize(self, raw: pl.DataFrame) -> pl.DataFrame:
        if raw.is_empty():
            return raw
        rows = []
        seq = 0
        for m in raw.iter_rows(named=True):
            market_id = str(m.get("id") or m.get("market_id") or m.get("conditionId") or "")
            ts = _parse_ts(m.get("updatedAt") or m.get("timestamp") or m.get("createdAt"))
            prices = m.get("outcomePrices") or m.get("outcome_prices") or []
            if isinstance(prices, str):
                prices = [p.strip() for p in prices.strip("[]").replace('"', "").split(",") if p.strip()]
            outcomes = m.get("outcomes") or ["Yes", "No"]
            if isinstance(outcomes, str):
                outcomes = [o.strip() for o in outcomes.strip("[]").replace('"', "").split(",") if o.strip()]
            tokens = m.get("clobTokenIds") or m.get("token_ids") or []
            exp = _parse_ts(m.get("endDate") or m.get("end_time") or m.get("expiration"))
            status = MarketStatus.RESOLVED.value if m.get("closed") or m.get("resolved") else MarketStatus.TRADING.value
            resolution = m.get("resolution") or m.get("umaResolutionStatus")
            if not prices:
                prices = [m.get("price"), None]
            for idx, outcome_name in enumerate(outcomes[:2]):
                outcome = Outcome.YES if str(outcome_name).lower() in ("yes", "up", "true") else Outcome.NO
                if idx == 0:
                    outcome = Outcome.YES
                if idx == 1:
                    outcome = Outcome.NO
                price = float(prices[idx]) if idx < len(prices) and prices[idx] not in (None, "") else None
                token = tokens[idx] if isinstance(tokens, list) and idx < len(tokens) else None
                rows.append(
                    {
                        "timestamp": ts,
                        "venue": self.venue.value,
                        "market_id": f"{market_id}:{outcome.value}" if token is None else str(token),
                        "event_type": EventType.QUOTE.value,
                        "outcome": outcome.value,
                        "side": None,
                        "price": price,
                        "quantity": _f(m.get("volumeNum") or m.get("volume")),
                        "bid": price,
                        "ask": price,
                        "open": None,
                        "high": None,
                        "low": None,
                        "close": price,
                        "volume": _f(m.get("volumeNum") or m.get("volume")),
                        "sequence": seq,
                        "status": status,
                        "expiration": exp,
                        "resolution": resolution,
                    }
                )
                seq += 1
        return pl.DataFrame(rows)


def _f(v) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(v)
    except Exception:
        return None


def _parse_ts(v) -> datetime | None:
    if v is None:
        return datetime.utcnow()
    if isinstance(v, datetime):
        return v.replace(tzinfo=None)
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return datetime.utcnow()
