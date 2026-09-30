from engine.backtest.engine import BacktestEngine
from engine.schema import StrategySpec, Venue
from engine.signals import evaluate_signal, SignalSpec
from tests.helpers import candle, quote, settlement, spec_kwargs


def test_signal_without_target_quotes_is_skipped():
    events = [candle(0, 100), candle(1, 102)]
    spec = StrategySpec.model_validate(spec_kwargs())
    r = BacktestEngine(spec).run(events, [])
    assert r.analytics.trade_count == 0
    assert any("target price" in w.lower() for w in r.warnings)


def test_target_only_no_reference_does_not_fire_momentum():
    events = [quote(0, 0.4), quote(1, 0.8), settlement(2, "YES")]
    spec = StrategySpec.model_validate(spec_kwargs())
    r = BacktestEngine(spec).run(events, [])
    assert r.analytics.trade_count == 0


def test_cross_venue_same_clock_reference_leads():
    # BTC jumps at t=1, PM still 0.40; entry should use 0.40 not a future 0.80
    events = [
        candle(0, 100, venue=Venue.BINANCE),
        candle(1, 102, venue=Venue.BINANCE),
        quote(0, 0.40, venue=Venue.KALSHI),
        quote(1, 0.40, venue=Venue.KALSHI),
        quote(2, 0.80, venue=Venue.KALSHI),
        settlement(3, "YES", venue=Venue.KALSHI),
    ]
    spec = StrategySpec.model_validate(spec_kwargs(execution={"latency_ms": 0, "slippage": "none", "fee_bps": 0}))
    r = BacktestEngine(spec).run(events, [])
    entry = [t for t in r.trades if t.reason == "entry"][0]
    assert entry.price <= 0.42


def test_polymarket_and_kalshi_divergence_signal():
    spec = SignalSpec(type="cross_venue_divergence", threshold=0.10, source="reference")
    ref = {"implied_probability": 0.40}
    tgt = {"implied_probability": 0.55}
    assert evaluate_signal(spec, ref, tgt) is True
    assert evaluate_signal(spec, {"implied_probability": 0.50}, {"implied_probability": 0.51}) is False


def test_divergence_needs_both_sides():
    spec = SignalSpec(type="cross_venue_divergence", threshold=0.05)
    assert evaluate_signal(spec, {"implied_probability": None}, {"implied_probability": 0.5}) is False
    assert evaluate_signal(spec, {"implied_probability": 0.5}, {"implied_probability": None}) is False


def test_partial_series_does_not_invent_quotes():
    events = [
        candle(0, 100),
        candle(1, 102),
        quote(5, 0.40),  # target appears late
        settlement(6, "YES"),
    ]
    spec = StrategySpec.model_validate(spec_kwargs())
    r = BacktestEngine(spec).run(events, [])
    entries = [t for t in r.trades if t.reason == "entry"]
    if entries:
        assert entries[0].signal_ts >= quote(5, 0.40).timestamp


def test_lookahead_reference_cannot_see_future_bar():
    # At t=1 the close is 102; t=2 close 200 must not be in the t=1 signal.
    events = [
        candle(0, 100),
        candle(1, 100.5),
        candle(2, 200),
        quote(0, 0.4),
        quote(1, 0.4),
        quote(2, 0.4),
        settlement(3, "YES"),
    ]
    spec = StrategySpec.model_validate(
        spec_kwargs(signal={"type": "momentum", "window": "1m", "threshold": 0.50, "source": "reference", "direction": "up"})
    )
    r = BacktestEngine(spec).run(events, [])
    entries = [t for t in r.trades if t.reason == "entry"]
    if entries:
        assert entries[0].signal_ts >= candle(2, 200).timestamp
    # 0.5% then 99% — threshold 50% can only fire on the last jump
    assert r.analytics.trade_count <= 1
