import polars as pl

from data.quality import assess_quality
from data.normalization.events import events_to_frame
from engine.backtest.engine import BacktestEngine
from engine.schema import StrategySpec, Venue
from tests.helpers import candle, quote, settlement, spec_kwargs, ts


def test_out_of_order_timestamps_flagged():
    frame = pl.DataFrame(
        {
            "timestamp": [ts(2), ts(1), ts(3)],
            "venue": ["BINANCE"] * 3,
            "market_id": ["BTCUSDT"] * 3,
            "event_type": ["CANDLE"] * 3,
            "outcome": ["NA"] * 3,
            "price": [100.0, 101.0, 102.0],
        }
    )
    report = assess_quality(frame, "oo", Venue.BINANCE, 60)
    assert report.out_of_order >= 1


def test_engine_reorders_before_processing():
    evs = [candle(2, 100), candle(0, 100), candle(1, 102), quote(1, 0.4), settlement(3, "YES")]
    spec = StrategySpec.model_validate(spec_kwargs())
    r = BacktestEngine(spec).run(evs, [])
    assert r.analytics.trade_count >= 1


def test_missing_bar_not_interpolated():
    # prices 100, gap, 103 — engine must not invent the missing print
    events = [
        candle(0, 100),
        candle(1, 100),
        candle(4, 103),  # 3-minute hole if step=60s
        quote(0, 0.5),
        quote(1, 0.5),
        quote(4, 0.5),
        settlement(5, "YES"),
    ]
    spec = StrategySpec.model_validate(spec_kwargs())
    result = BacktestEngine(spec).run(events, [])
    # momentum window is 1 bar; 100 → 103 is a 3% move across a hole, not three 1% bars
    assert result.analytics.trade_count <= 1


def test_quality_reports_gaps():
    events = [candle(0, 100), candle(1, 101), candle(10, 102)]
    report = assess_quality(events_to_frame(events), "gap", Venue.BINANCE, 60)
    assert report.missing_intervals >= 1


def test_engine_sorts_mixed_venue_timestamps():
    events = [
        quote(2, 0.4),
        candle(0, 100),
        candle(1, 102),
        quote(1, 0.4),
        settlement(3, "YES"),
    ]
    spec = StrategySpec.model_validate(spec_kwargs())
    result = BacktestEngine(spec).run(events, [])
    times = [t.signal_ts for t in result.trades if t.reason == "entry"]
    assert times == sorted(times)


def test_same_timestamp_uses_sequence():
    a = candle(1, 100)
    b = candle(1, 102)
    b.sequence = 1
    a.sequence = 0
    events = [b, a, quote(1, 0.5), settlement(2, "YES")]
    spec = StrategySpec.model_validate(spec_kwargs())
    BacktestEngine(spec).run(events, [])  # must not crash
