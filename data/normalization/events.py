from __future__ import annotations

from datetime import datetime
from typing import Iterable

import polars as pl

from engine.schema import EventType, MarketEvent, MarketStatus, Outcome, Side, Venue


EVENT_COLUMNS = [
    "timestamp",
    "venue",
    "market_id",
    "event_type",
    "outcome",
    "side",
    "price",
    "quantity",
    "bid",
    "ask",
    "open",
    "high",
    "low",
    "close",
    "volume",
    "sequence",
    "status",
    "expiration",
    "resolution",
]


def events_to_frame(events: Iterable[MarketEvent]) -> pl.DataFrame:
    rows = []
    for e in events:
        rows.append(
            {
                "timestamp": e.timestamp,
                "venue": e.venue.value,
                "market_id": e.market_id,
                "event_type": e.event_type.value,
                "outcome": e.outcome.value,
                "side": e.side.value if e.side else None,
                "price": e.price,
                "quantity": e.quantity,
                "bid": e.bid,
                "ask": e.ask,
                "open": e.open,
                "high": e.high,
                "low": e.low,
                "close": e.close,
                "volume": e.volume,
                "sequence": e.sequence,
                "status": e.status.value if e.status else None,
                "expiration": e.expiration,
                "resolution": e.resolution,
            }
        )
    if not rows:
        return empty_events_frame()
    return pl.DataFrame(rows).sort(["timestamp", "sequence"])


def empty_events_frame() -> pl.DataFrame:
    return pl.DataFrame(
        schema={
            "timestamp": pl.Datetime("us"),
            "venue": pl.String,
            "market_id": pl.String,
            "event_type": pl.String,
            "outcome": pl.String,
            "side": pl.String,
            "price": pl.Float64,
            "quantity": pl.Float64,
            "bid": pl.Float64,
            "ask": pl.Float64,
            "open": pl.Float64,
            "high": pl.Float64,
            "low": pl.Float64,
            "close": pl.Float64,
            "volume": pl.Float64,
            "sequence": pl.Int64,
            "status": pl.String,
            "expiration": pl.Datetime("us"),
            "resolution": pl.String,
        }
    )


def frame_to_events(frame: pl.DataFrame) -> list[MarketEvent]:
    events: list[MarketEvent] = []
    for row in frame.sort(["timestamp", "sequence"]).iter_rows(named=True):
        events.append(
            MarketEvent(
                timestamp=_as_dt(row["timestamp"]),
                venue=Venue(row["venue"]),
                market_id=row["market_id"],
                event_type=EventType(row["event_type"]),
                outcome=Outcome(row["outcome"]) if row.get("outcome") else Outcome.NA,
                side=Side(row["side"]) if row.get("side") else None,
                price=row.get("price"),
                quantity=row.get("quantity"),
                bid=row.get("bid"),
                ask=row.get("ask"),
                open=row.get("open"),
                high=row.get("high"),
                low=row.get("low"),
                close=row.get("close"),
                volume=row.get("volume"),
                sequence=row.get("sequence"),
                status=MarketStatus(row["status"]) if row.get("status") else None,
                expiration=_as_dt(row["expiration"]) if row.get("expiration") else None,
                resolution=row.get("resolution"),
            )
        )
    return events


def _as_dt(value) -> datetime:
    if isinstance(value, datetime):
        return value.replace(tzinfo=None) if value.tzinfo else value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
