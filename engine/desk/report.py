"""Turn a zero-cost tape into the same metrics the desk charts use.

`fee_frac` and `slip_frac` are fractions of equity per fill.
The sliders are percents: 0.1 and 0.05 become 0.001 and 0.0005.
Gross P&L ignores those costs. Net P&L includes them.
An open position is marked to market and counted as one trade.
"""

from __future__ import annotations

import math

INITIAL = 100_000.0


def report(tape: list[dict], fee_frac: float = 0.001, slip_frac: float = 0.0005) -> dict:
    cost = max(0.0, fee_frac) + max(0.0, slip_frac)
    capital = INITIAL
    gross_eq = INITIAL
    entry = capital
    in_pos = False
    closed: list[float] = []
    equity = [capital]
    for day in tape:
        if day.get("opened"):
            entry = capital
            in_pos = True
        turn = int(day.get("turn") or 0)
        gross = float(day["gross"])
        capital *= 1.0 + gross - turn * cost
        gross_eq *= 1.0 + gross
        equity.append(capital)
        if day.get("closed"):
            closed.append(capital - entry)
            in_pos = False
    if in_pos:
        closed.append(capital - entry)
    metrics = _metrics(equity, closed, gross_eq)
    metrics["open_marked"] = bool(tape) and int(tape[-1].get("pos") or 0) != 0
    return metrics


def _metrics(equity: list[float], closed: list[float], gross_end: float) -> dict:
    start = equity[0] if equity else INITIAL
    end = equity[-1] if equity else start
    rets = [(equity[i] / equity[i - 1] - 1.0) if equity[i - 1] else 0.0 for i in range(1, len(equity))]
    mean = sum(rets) / len(rets) if rets else 0.0
    sd = _stdev(rets)
    down = math.sqrt(sum(min(r, 0.0) ** 2 for r in rets) / len(rets)) if rets else 0.0
    peak = start
    mdd = 0.0
    underwater = 0
    max_under = 0
    for value in equity:
        peak = max(peak, value)
        dd = value / peak - 1.0 if peak else 0.0
        mdd = min(mdd, dd)
        if dd < -0.0001:
            underwater += 1
            max_under = max(max_under, underwater)
        else:
            underwater = 0
    years = max(len(rets) / 252.0, 1 / 252)
    cagr = (end / start) ** (1 / years) - 1.0 if end > 0 and start > 0 else 0.0
    gains = [r for r in rets if r > 0]
    losses = [r for r in rets if r < 0]
    wins = [p for p in closed if p > 0]
    return {
        "total_return": end / start - 1.0 if start else 0.0,
        "cagr": cagr,
        "gross_pnl": gross_end - start,
        "net_pnl": end - start,
        "sharpe": (mean / sd) * math.sqrt(252) if sd else None,
        "sortino": (mean / down) * math.sqrt(252) if down else None,
        "calmar": cagr / abs(mdd) if mdd < 0 else None,
        "max_drawdown": mdd,
        "max_dd_days": max_under,
        "max_gain": max(gains) if gains else 0.0,
        "max_loss": min(losses) if losses else 0.0,
        "win_rate": (len(wins) / len(closed)) if closed else None,
        "trade_count": len(closed),
        "starting_equity": start,
        "ending_equity": end,
        "volatility": sd * math.sqrt(252) if sd else None,
    }


def _stdev(xs: list[float]) -> float:
    if len(xs) < 2:
        return 0.0
    m = sum(xs) / len(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))
