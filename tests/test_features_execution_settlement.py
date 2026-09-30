from datetime import datetime, timedelta

from engine.execution.simulator import ExecutionSimulator
from engine.features.engine import FeatureEngine
from engine.schema import EventType, ExecutionSpec, MarketEvent, Outcome, Side, SlippageModel, Venue
from engine.settlement.binary import settle_binary


def test_features_are_causal():
    eng = FeatureEngine(window_bars=2)
    t0 = datetime(2025, 1, 1)
    a = MarketEvent(
        timestamp=t0,
        venue=Venue.BINANCE,
        market_id="BTCUSDT",
        event_type=EventType.CANDLE,
        close=100.0,
        price=100.0,
    )
    b = MarketEvent(
        timestamp=t0 + timedelta(minutes=5),
        venue=Venue.BINANCE,
        market_id="BTCUSDT",
        event_type=EventType.CANDLE,
        close=101.0,
        price=101.0,
    )
    eng.on_event(a)
    snap0 = eng.state.snapshot("BINANCE:BTCUSDT")
    assert snap0["return"] is None
    eng.on_event(b)
    snap1 = eng.state.snapshot("BINANCE:BTCUSDT")
    assert snap1["return"] is not None
    assert abs(snap1["return"] - 0.01) < 1e-9


def test_execution_buy_uses_ask_and_slippage():
    sim = ExecutionSimulator(ExecutionSpec(model="market", latency_ms=100, slippage=SlippageModel.LOW, fee_bps=10))
    fill = sim.fill(Side.BUY, 0.50, 100, bid=0.49, ask=0.51, signal_ts=datetime(2025, 1, 1))
    assert fill.fill_ts > datetime(2025, 1, 1)
    assert fill.price >= 0.51
    assert fill.fees > 0


def test_settlement_yes_no():
    assert settle_binary(Outcome.YES, Outcome.YES) == 1.0
    assert settle_binary(Outcome.YES, Outcome.NO) == 0.0
    assert settle_binary(Outcome.NO, Outcome.NO) == 1.0


def test_settlement_refuses_inference():
    import pytest

    with pytest.raises(ValueError):
        settle_binary(Outcome.YES, Outcome.NA)
