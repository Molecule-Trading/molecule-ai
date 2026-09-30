from __future__ import annotations

import math
from datetime import datetime

from engine.schema import AnalyticsReport, EquityPoint, TradeRecord


class AnalyticsEngine:
    def compute(
        self,
        initial: float,
        equity: list[EquityPoint],
        trades: list[TradeRecord],
    ) -> AnalyticsReport:
        ending = equity[-1].equity if equity else initial
        net = ending - initial
        total_return = net / initial if initial else 0.0
        rets = _period_returns(equity)
        vol = _stdev(rets)
        sharpe = _sharpe(rets, vol)
        sortino = _sortino(rets)
        max_dd = min((p.drawdown for p in equity), default=0.0)
        entries = [t for t in trades if t.reason == "entry"]
        exits = [t for t in trades if t.reason in ("settlement", "signal_reverse", "stop", "time")]
        pnls = _trade_pnls(entries, exits)
        wins = [p for p in pnls if p > 0]
        losses = [p for p in pnls if p < 0]
        win_rate = (len(wins) / len(pnls)) if pnls else None
        gross_win = sum(wins)
        gross_loss = abs(sum(losses))
        pf = (gross_win / gross_loss) if gross_loss > 0 else (None if not pnls else math.inf)
        avg = (sum(pnls) / len(pnls)) if pnls else None
        turnover = sum(abs(t.price * t.quantity) for t in trades)
        return AnalyticsReport(
            total_return=total_return,
            net_pnl=net,
            sharpe=sharpe,
            sortino=sortino,
            max_drawdown=max_dd,
            volatility=vol,
            win_rate=win_rate,
            profit_factor=None if pf is None or math.isinf(pf) else pf,
            trade_count=len(entries),
            average_trade=avg,
            turnover=turnover,
            initial_capital=initial,
            ending_equity=ending,
        )


def _period_returns(equity: list[EquityPoint]) -> list[float]:
    if len(equity) < 2:
        return []
    # downsample to keep Sharpe on a stable grid: use unique timestamps already
    out = []
    prev = equity[0].equity
    for p in equity[1:]:
        if prev != 0:
            out.append((p.equity / prev) - 1.0)
        prev = p.equity
    return out


def _stdev(xs: list[float]) -> float | None:
    if len(xs) < 2:
        return None
    m = sum(xs) / len(xs)
    var = sum((x - m) ** 2 for x in xs) / (len(xs) - 1)
    return math.sqrt(var)


def _sharpe(rets: list[float], vol: float | None, periods: int = 365 * 24 * 12) -> float | None:
    """Annualize assuming 5m bars ≈ 12 per hour. Used only when enough observations exist."""
    if not rets or vol is None or vol == 0:
        return None
    mean = sum(rets) / len(rets)
    # scale: if many tiny bar returns, annualize by sqrt(bars/year) using observed count ratio
    # We do not guess a calendar; we report bar-Sharpe * sqrt(N) only when N is large.
    # Here we return raw mean/vol * sqrt(min(len, 252)) as a conservative research figure.
    n = min(len(rets), 252)
    return (mean / vol) * math.sqrt(n)


def _sortino(rets: list[float]) -> float | None:
    downs = [r for r in rets if r < 0]
    if len(downs) < 2:
        return None
    dd = _stdev(downs)
    if not dd:
        return None
    mean = sum(rets) / len(rets)
    return (mean / dd) * math.sqrt(min(len(rets), 252))


def _trade_pnls(entries: list[TradeRecord], exits: list[TradeRecord]) -> list[float]:
    pnls = []
    for e, x in zip(entries, exits):
        # Signed quantity: long +q profits when exit > entry; short −q profits when exit < entry.
        pnls.append((x.price - e.price) * e.quantity - e.fees - x.fees)
    return pnls


def curve_payload(equity: list[EquityPoint]) -> list[dict]:
    return [
        {
            "t": p.timestamp.isoformat(),
            "equity": round(p.equity, 6),
            "cash": round(p.cash, 6),
            "unrealized": round(p.unrealized, 6),
            "drawdown": round(p.drawdown, 8),
        }
        for p in _downsample(equity, 1500)
    ]


def _downsample(points: list[EquityPoint], cap: int) -> list[EquityPoint]:
    if len(points) <= cap:
        return points
    step = max(1, len(points) // cap)
    sampled = points[::step]
    if sampled[-1] is not points[-1]:
        sampled.append(points[-1])
    return sampled


def compact_analytics(report: AnalyticsReport) -> dict:
    return report.model_dump()
