from __future__ import annotations

from copy import deepcopy

from engine.backtest.engine import BacktestEngine
from engine.schema import MarketEvent, DatasetMeta, SlippageModel, StrategySpec


DEFAULT_GRID = {
    "window": ["1m", "5m", "15m", "30m"],
    "latency_ms": [50, 100, 250],
    "slippage": ["low", "medium", "high"],
}


def run_sensitivity(
    base: StrategySpec,
    events: list[MarketEvent],
    datasets: list[DatasetMeta],
    grid: dict | None = None,
) -> list[dict]:
    grid = grid or DEFAULT_GRID
    rows: list[dict] = []
    windows = grid.get("window") or [base.signal.window]
    latencies = grid.get("latency_ms") or [base.execution.latency_ms]
    slippages = grid.get("slippage") or [base.execution.slippage.value]
    for window in windows:
        for lat in latencies:
            for slip in slippages:
                spec = deepcopy(base)
                spec.signal.window = window
                spec.execution.latency_ms = int(lat)
                spec.execution.slippage = SlippageModel(slip)
                result = BacktestEngine(spec).run(events, datasets)
                a = result.analytics
                rows.append(
                    {
                        "window": window,
                        "latency_ms": lat,
                        "slippage": slip,
                        "net_pnl": a.net_pnl,
                        "sharpe": a.sharpe,
                        "max_drawdown": a.max_drawdown,
                        "trades": a.trade_count,
                        "total_return": a.total_return,
                    }
                )
    return rows
