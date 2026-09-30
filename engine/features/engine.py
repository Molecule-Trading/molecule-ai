"""Deterministic feature calculations. Never computed by Grok."""

from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime

from engine.schema import EventType, MarketEvent, Outcome


def window_to_bars(window: str, bar_seconds: int) -> int:
    unit = window[-1].lower()
    n = int(window[:-1])
    seconds = {"s": n, "m": n * 60, "h": n * 3600, "d": n * 86400}[unit]
    return max(1, seconds // max(bar_seconds, 1))


class Rolling:
    def __init__(self, n: int):
        self.n = max(1, n)
        self.q: deque[float] = deque()

    def push(self, x: float) -> None:
        self.q.append(x)
        while len(self.q) > self.n:
            self.q.popleft()

    def ret(self) -> float | None:
        if len(self.q) < 2:
            return None
        a, b = self.q[0], self.q[-1]
        if a == 0:
            return None
        return (b / a) - 1.0

    def last(self) -> float | None:
        return self.q[-1] if self.q else None

    def first(self) -> float | None:
        return self.q[0] if self.q else None

    def vol(self) -> float | None:
        if len(self.q) < 3:
            return None
        rets = []
        prev = None
        for x in self.q:
            if prev and prev != 0:
                rets.append((x / prev) - 1.0)
            prev = x
        if len(rets) < 2:
            return None
        mean = sum(rets) / len(rets)
        var = sum((r - mean) ** 2 for r in rets) / (len(rets) - 1)
        return var**0.5

    def momentum(self) -> float | None:
        return self.ret()

    def acceleration(self) -> float | None:
        if len(self.q) < 3:
            return None
        mid = self.q[len(self.q) // 2]
        a, b = self.q[0], self.q[-1]
        if a == 0 or mid == 0:
            return None
        return ((b / mid) - 1.0) - ((mid / a) - 1.0)

    def change(self) -> float | None:
        if len(self.q) < 2:
            return None
        return self.q[-1] - self.q[0]


class FeatureState:
    """Causal feature store: values at time t use only data <= t."""

    def __init__(self, window_bars: int = 1):
        self.window_bars = window_bars
        self.prices: dict[str, Rolling] = defaultdict(lambda: Rolling(window_bars + 1))
        self.volumes: dict[str, Rolling] = defaultdict(lambda: Rolling(window_bars + 1))
        self.last_price: dict[str, float] = {}
        self.last_bid: dict[str, float] = {}
        self.last_ask: dict[str, float] = {}
        self.last_volume: dict[str, float] = {}
        self.last_ts: dict[str, datetime] = {}
        self.expiry: dict[str, datetime] = {}
        self.resolved: dict[str, str] = {}

    def key(self, ev: MarketEvent) -> str:
        if ev.outcome and ev.outcome != Outcome.NA:
            return f"{ev.venue.value}:{ev.market_id}:{ev.outcome.value}"
        return f"{ev.venue.value}:{ev.market_id}"

    def update(self, ev: MarketEvent) -> None:
        k = self.key(ev)
        px = ev.close if ev.close is not None else ev.price
        if px is None and ev.bid is not None and ev.ask is not None:
            px = (ev.bid + ev.ask) / 2.0
        if px is not None:
            self.prices[k].push(px)
            self.last_price[k] = px
        if ev.volume is not None:
            self.volumes[k].push(ev.volume)
            self.last_volume[k] = ev.volume
        if ev.bid is not None:
            self.last_bid[k] = ev.bid
        if ev.ask is not None:
            self.last_ask[k] = ev.ask
        self.last_ts[k] = ev.timestamp
        if ev.expiration:
            self.expiry[k] = ev.expiration
        if ev.event_type == EventType.SETTLEMENT and ev.resolution:
            self.resolved[k] = ev.resolution

    def snapshot(self, key: str, now: datetime | None = None) -> dict[str, float | None]:
        roll = self.prices[key]
        vol = self.volumes[key]
        bid = self.last_bid.get(key)
        ask = self.last_ask.get(key)
        spread = (ask - bid) if bid is not None and ask is not None else None
        tte = None
        if now and key in self.expiry:
            tte = (self.expiry[key] - now).total_seconds()
        return {
            "price": self.last_price.get(key),
            "return": roll.ret(),
            "momentum": roll.momentum(),
            "volatility": roll.vol(),
            "acceleration": roll.acceleration(),
            "volume": self.last_volume.get(key),
            "volume_change": vol.change(),
            "spread": spread,
            "implied_probability": self.last_price.get(key),
            "probability_change": roll.change(),
            "probability_momentum": roll.momentum(),
            "probability_acceleration": roll.acceleration(),
            "time_to_expiry": tte,
        }


class FeatureEngine:
    def __init__(self, window_bars: int = 1):
        self.state = FeatureState(window_bars=window_bars)

    def on_event(self, ev: MarketEvent) -> None:
        self.state.update(ev)

    def for_market(self, venue: str, market_id: str, outcome: str | None = None) -> str:
        if outcome and outcome != "NA":
            return f"{venue}:{market_id}:{outcome}"
        return f"{venue}:{market_id}"
