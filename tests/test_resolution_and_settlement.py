import pytest

from engine.backtest.engine import BacktestEngine
from engine.schema import Outcome, StrategySpec
from engine.settlement.binary import settle_binary, settlement_cash
from tests.helpers import candle, quote, settlement, spec_kwargs


def _path(winner: str):
    return [candle(0, 100), candle(1, 102), quote(0, 0.40), quote(1, 0.40), settlement(2, winner)]


def test_yes_long_settles_to_one():
    r = BacktestEngine(StrategySpec.model_validate(spec_kwargs())).run(_path("YES"), [])
    assert r.analytics.trade_count == 1
    assert [t for t in r.trades if t.reason == "settlement"][0].price == 1.0
    assert r.analytics.net_pnl > 0


def test_yes_long_loses_when_no_wins():
    r = BacktestEngine(StrategySpec.model_validate(spec_kwargs())).run(_path("NO"), [])
    assert [t for t in r.trades if t.reason == "settlement"][0].price == 0.0
    assert r.analytics.net_pnl < 0


def test_no_long_wins_when_no_resolves():
    r = BacktestEngine(StrategySpec.model_validate(spec_kwargs(entry={"action": "BUY", "outcome": "NO"}))).run(_path("NO"), [])
    assert [t for t in r.trades if t.reason == "settlement"][0].price == 1.0
    assert r.analytics.net_pnl > 0


def test_short_yes_profits_when_no_wins():
    r = BacktestEngine(StrategySpec.model_validate(spec_kwargs(entry={"action": "SELL", "outcome": "YES"}))).run(_path("NO"), [])
    assert r.analytics.net_pnl > 0


def test_short_yes_loses_when_yes_wins():
    r = BacktestEngine(StrategySpec.model_validate(spec_kwargs(entry={"action": "SELL", "outcome": "YES"}))).run(_path("YES"), [])
    assert r.analytics.net_pnl < 0


def test_unresolved_does_not_invent_winner():
    events = [candle(0, 100), candle(1, 102), quote(0, 0.4), quote(1, 0.4)]
    r = BacktestEngine(StrategySpec.model_validate(spec_kwargs())).run(events, [])
    assert not any(t.reason == "settlement" for t in r.trades)
    assert any("resolution" in w.lower() or "open" in w.lower() for w in r.warnings)


def test_garbage_resolution_does_not_infer():
    ev = settlement(2, "YES")
    ev.resolution = "MAYBE"
    events = [candle(0, 100), candle(1, 102), quote(0, 0.4), quote(1, 0.4), ev]
    r = BacktestEngine(StrategySpec.model_validate(spec_kwargs())).run(events, [])
    assert not any(t.reason == "settlement" for t in r.trades)


def test_settle_binary_rejects_na():
    with pytest.raises(ValueError):
        settle_binary(Outcome.YES, Outcome.NA)


def test_settlement_cash_signed():
    assert settlement_cash(10, Outcome.YES, Outcome.YES) == 10
    assert settlement_cash(10, Outcome.YES, Outcome.NO) == 0
    assert settlement_cash(-10, Outcome.YES, Outcome.YES) == -10
    assert settlement_cash(-10, Outcome.YES, Outcome.NO) == 0
