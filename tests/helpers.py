from __future__ import annotations

from datetime import datetime, timedelta

from engine.schema import EventType, MarketEvent, MarketStatus, Outcome, Venue


def ts(i: int, start: datetime | None = None, step_s: int = 60) -> datetime:
    start = start or datetime(2025, 1, 1, 0, 0, 0)
    return start + timedelta(seconds=i * step_s)


def candle(i: int, price: float, market_id: str = "BTCUSDT", venue: Venue = Venue.BINANCE, start: datetime | None = None, step_s: int = 60, volume: float = 10.0) -> MarketEvent:
    t = ts(i, start, step_s)
    return MarketEvent(timestamp=t, venue=venue, market_id=market_id, event_type=EventType.CANDLE, outcome=Outcome.NA, price=price, close=price, open=price, high=price, low=price, volume=volume, bid=price - 0.5, ask=price + 0.5, sequence=i)


def quote(i: int, price: float, market_id: str = "MKT", venue: Venue = Venue.KALSHI, outcome: Outcome = Outcome.YES, start: datetime | None = None, step_s: int = 60, bid: float | None = None, ask: float | None = None) -> MarketEvent:
    t = ts(i, start, step_s)
    return MarketEvent(timestamp=t, venue=venue, market_id=market_id, event_type=EventType.QUOTE, outcome=outcome, price=price, close=price, bid=price - 0.01 if bid is None else bid, ask=price + 0.01 if ask is None else ask, volume=100.0, sequence=i, status=MarketStatus.TRADING)


def settlement(i: int, winner: str, market_id: str = "MKT", venue: Venue = Venue.KALSHI, start: datetime | None = None, step_s: int = 60) -> MarketEvent:
    t = ts(i, start, step_s)
    payout = 1.0 if winner.upper() == "YES" else 0.0
    return MarketEvent(timestamp=t, venue=venue, market_id=market_id, event_type=EventType.SETTLEMENT, outcome=Outcome.YES, price=payout, close=payout, sequence=i, status=MarketStatus.RESOLVED, resolution=winner.upper())


def spec_kwargs(**overrides):
    base = {
        "name": "t",
        "universe": {"reference": {"venue": "BINANCE", "symbol": "BTCUSDT"}, "target": {"venue": "KALSHI", "market_id": "MKT"}},
        "data": {"timeframe": "1m"},
        "signal": {"type": "momentum", "window": "1m", "threshold": 0.01, "source": "reference", "direction": "abs"},
        "entry": {"action": "BUY", "outcome": "YES"},
        "exit": {"type": "SETTLEMENT"},
        "sizing": {"type": "fixed_contracts", "contracts": 10},
        "execution": {"latency_ms": 0, "slippage": "none", "fee_bps": 0},
        "capital": {"initial": 10000},
        "risk": {"one_position": True},
    }
    base.update(overrides)
    return base
