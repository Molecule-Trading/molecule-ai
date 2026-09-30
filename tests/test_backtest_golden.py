from engine.backtest.engine import BacktestEngine
from engine.validate import validate_strategy


def test_validation_passes_on_fixtures(base_spec, datasets):
    result = validate_strategy(base_spec, datasets)
    assert result.valid, result.errors


def test_validation_fails_unknown_market(base_spec, datasets):
    spec = base_spec.model_copy(deep=True)
    spec.universe.target.market_id = "DOES-NOT-EXIST"
    spec.universe.target.ticker = None
    spec.universe.target.symbol = None
    out = validate_strategy(spec, datasets)
    assert not out.valid


def test_golden_backtest_is_deterministic(base_spec, events, datasets):
    a = BacktestEngine(base_spec).run(events, datasets)
    b = BacktestEngine(base_spec).run(events, datasets)
    assert a.analytics.net_pnl == b.analytics.net_pnl
    assert a.analytics.trade_count == b.analytics.trade_count
    assert a.analytics.ending_equity == b.analytics.ending_equity
    assert a.analytics.trade_count >= 1
    assert a.analytics.net_pnl > 0
    assert a.analytics.max_drawdown <= 0
    entries = [t for t in a.trades if t.reason == "entry"]
    assert entries
    assert entries[0].signal_ts.hour >= 3


def test_unresolved_does_not_invent_settlement(base_spec, events, datasets):
    filtered = [e for e in events if e.event_type.value != "SETTLEMENT"]
    result = BacktestEngine(base_spec).run(filtered, datasets)
    assert any("resolution" in w.lower() or "open" in w.lower() for w in result.warnings)
