from datetime import datetime, timedelta

from engine.features.engine import FeatureEngine, window_to_bars
from engine.schema import EventType, MarketEvent, Outcome, Venue
from engine.signals import evaluate_signal
from engine.schema import SignalSpec


def test_window_to_bars():
    assert window_to_bars("5m", 60) == 5
    assert window_to_bars("1m", 60) == 1
    assert window_to_bars("15m", 300) == 3


def test_volatility_none_until_enough_points():
    eng = FeatureEngine(window_bars=5)
    t0 = datetime(2025, 1, 1)
    for i, px in enumerate([100.0, 101.0]):
        eng.on_event(
            MarketEvent(
                timestamp=t0 + timedelta(minutes=i),
                venue=Venue.BINANCE,
                market_id="BTCUSDT",
                event_type=EventType.CANDLE,
                close=px,
                price=px,
            )
        )
    snap = eng.state.snapshot("BINANCE:BTCUSDT")
    assert snap["volatility"] is None


def test_probability_change_is_causal():
    eng = FeatureEngine(window_bars=2)
    t0 = datetime(2025, 1, 1)
    for i, px in enumerate([0.40, 0.50]):
        eng.on_event(
            MarketEvent(
                timestamp=t0 + timedelta(minutes=i),
                venue=Venue.KALSHI,
                market_id="M",
                event_type=EventType.QUOTE,
                outcome=Outcome.YES,
                price=px,
                close=px,
            )
        )
    snap = eng.state.snapshot("KALSHI:M:YES")
    assert snap["probability_change"] is not None
    assert abs(snap["probability_change"] - 0.10) < 1e-9


def test_mean_reversion_requires_magnitude():
    spec = SignalSpec(type="probability_mean_reversion", threshold=0.05)
    assert evaluate_signal(spec, {"probability_change": 0.01}, {}) is False
    assert evaluate_signal(spec, {"probability_change": 0.09}, {}) is True


def test_vol_shock_requires_value():
    spec = SignalSpec(type="volatility_shock", threshold=0.02)
    assert evaluate_signal(spec, {"volatility": None}, {}) is False
    assert evaluate_signal(spec, {"volatility": 0.03}, {}) is True
