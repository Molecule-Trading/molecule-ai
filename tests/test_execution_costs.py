from datetime import timedelta

from engine.backtest.engine import BacktestEngine
from engine.execution.simulator import ExecutionSimulator
from engine.schema import ExecutionSpec, Side, SlippageModel, StrategySpec
from tests.helpers import candle, quote, settlement, spec_kwargs, ts


def _events():
    return [
        candle(0, 100),
        candle(1, 102),
        quote(0, 0.50, bid=0.49, ask=0.51),
        quote(1, 0.50, bid=0.49, ask=0.51),
        settlement(3, "YES"),
    ]


def test_fees_reduce_pnl_vs_zero_fee():
    events = _events()
    free = StrategySpec.model_validate(spec_kwargs(execution={"latency_ms": 0, "slippage": "none", "fee_bps": 0}))
    taxed = StrategySpec.model_validate(spec_kwargs(execution={"latency_ms": 0, "slippage": "none", "fee_bps": 100}))
    a = BacktestEngine(free).run(events, [])
    b = BacktestEngine(taxed).run(events, [])
    assert b.analytics.net_pnl < a.analytics.net_pnl
    assert any(t.fees > 0 for t in b.trades if t.reason == "entry")


def test_slippage_worsens_buy_price():
    events = _events()
    none = StrategySpec.model_validate(spec_kwargs(execution={"latency_ms": 0, "slippage": "none", "fee_bps": 0}))
    high = StrategySpec.model_validate(spec_kwargs(execution={"latency_ms": 0, "slippage": "high", "fee_bps": 0}))
    a = BacktestEngine(none).run(events, [])
    b = BacktestEngine(high).run(events, [])
    pa = [t.price for t in a.trades if t.reason == "entry"][0]
    pb = [t.price for t in b.trades if t.reason == "entry"][0]
    assert pb > pa
    assert b.analytics.net_pnl <= a.analytics.net_pnl


def test_buy_crosses_ask():
    sim = ExecutionSimulator(ExecutionSpec(model="market", latency_ms=0, slippage=SlippageModel.NONE, fee_bps=0))
    fill = sim.fill(Side.BUY, 0.50, 10, bid=0.49, ask=0.51, signal_ts=ts(0))
    assert fill.price == 0.51


def test_sell_crosses_bid():
    sim = ExecutionSimulator(ExecutionSpec(model="market", latency_ms=0, slippage=SlippageModel.NONE, fee_bps=0))
    fill = sim.fill(Side.SELL, 0.50, 10, bid=0.49, ask=0.51, signal_ts=ts(0))
    assert fill.price == 0.49


def test_latency_defers_fill_to_later_event():
    # signal at t=1s, latency 90s → fill on the t=2 event (120s)
    events = [
        candle(0, 100),
        candle(1, 102),
        candle(2, 102),
        quote(0, 0.40),
        quote(1, 0.40),
        quote(2, 0.70),
        settlement(3, "YES"),
    ]
    spec = StrategySpec.model_validate(
        spec_kwargs(execution={"latency_ms": 90_000, "slippage": "none", "fee_bps": 0})
    )
    r = BacktestEngine(spec).run(events, [])
    entries = [t for t in r.trades if t.reason == "entry"]
    assert entries
    assert entries[0].fill_ts >= entries[0].signal_ts + timedelta(milliseconds=90_000)
    # book at fill time is the 0.70 quote, not the 0.40 signal-time quote
    assert entries[0].price >= 0.69


def test_zero_latency_fill_not_before_signal():
    events = _events()
    spec = StrategySpec.model_validate(spec_kwargs(execution={"latency_ms": 0, "slippage": "none", "fee_bps": 0}))
    r = BacktestEngine(spec).run(events, [])
    for t in r.trades:
        if t.reason == "entry":
            assert t.fill_ts >= t.signal_ts


def test_assumptions_expose_costs():
    spec = StrategySpec.model_validate(spec_kwargs(execution={"latency_ms": 250, "slippage": "medium", "fee_bps": 12}))
    r = BacktestEngine(spec).run(_events(), [])
    assert r.assumptions["latency_ms"] == 250
    assert r.assumptions["slippage"] == "medium"
    assert r.assumptions["fees_bps"] == 12
