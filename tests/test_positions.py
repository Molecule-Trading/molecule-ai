from engine.backtest.engine import BacktestEngine
from engine.schema import StrategySpec
from tests.helpers import candle, quote, settlement, spec_kwargs


def test_one_position_blocks_second_entry():
    events = [
        candle(0, 100),
        candle(1, 102),
        candle(2, 105),
        quote(0, 0.4),
        quote(1, 0.4),
        quote(2, 0.4),
        settlement(3, "YES"),
    ]
    spec = StrategySpec.model_validate(spec_kwargs(risk={"one_position": True}))
    r = BacktestEngine(spec).run(events, [])
    assert r.analytics.trade_count == 1


def test_stacking_when_one_position_disabled():
    events = [
        candle(0, 100),
        candle(1, 102),
        candle(2, 105),
        quote(0, 0.4),
        quote(1, 0.4),
        quote(2, 0.4),
        settlement(3, "YES"),
    ]
    spec = StrategySpec.model_validate(
        spec_kwargs(risk={"one_position": False, "max_trades": 2}, sizing={"type": "fixed_contracts", "contracts": 5})
    )
    r = BacktestEngine(spec).run(events, [])
    assert r.analytics.trade_count == 2
    entries = [t for t in r.trades if t.reason == "entry"]
    assert abs(sum(t.quantity for t in entries) - 10) < 1e-9


def test_max_trades_cap():
    events = [
        candle(0, 100),
        candle(1, 102),
        candle(2, 105),
        candle(3, 108),
        quote(0, 0.4),
        quote(1, 0.4),
        quote(2, 0.4),
        quote(3, 0.4),
        settlement(4, "YES"),
    ]
    spec = StrategySpec.model_validate(spec_kwargs(risk={"one_position": False, "max_trades": 1}))
    r = BacktestEngine(spec).run(events, [])
    assert r.analytics.trade_count == 1


def test_insufficient_cash_skips_entry():
    events = [
        candle(0, 100),
        candle(1, 102),
        quote(0, 0.5),
        quote(1, 0.5),
        settlement(2, "YES"),
    ]
    spec = StrategySpec.model_validate(
        spec_kwargs(
            capital={"initial": 1},
            sizing={"type": "fixed_contracts", "contracts": 100},
        )
    )
    r = BacktestEngine(spec).run(events, [])
    assert r.analytics.trade_count == 0
    assert any("cash" in w.lower() for w in r.warnings)


def test_fixed_notional_sizes_off_last_price():
    events = [
        candle(0, 100),
        candle(1, 102),
        quote(0, 0.50),
        quote(1, 0.50),
        settlement(2, "YES"),
    ]
    spec = StrategySpec.model_validate(spec_kwargs(sizing={"type": "fixed_notional", "notional": 100}))
    r = BacktestEngine(spec).run(events, [])
    entry = [t for t in r.trades if t.reason == "entry"][0]
    # Sized on last mid (0.50) → 200 contracts; fill may cross the ask.
    assert abs(entry.quantity - 200) < 1e-9
    assert 0.49 <= entry.price <= 0.52
