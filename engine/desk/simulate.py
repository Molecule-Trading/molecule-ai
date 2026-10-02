"""Daily OHLC backtest.

Signals are known at the close and fill on the next open.
Stops and targets fill inside the bar. A bar that trades through both fills the stop.
The trail uses the extreme from prior bars only, never this bar's high or low.
Quantity is floor(cash / fill price). Costs are not inside `gross`; the desk sliders apply them.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from engine.desk.schema import DeskSpec, Rule


@dataclass
class Bar:
    t: str
    o: float
    h: float
    l: float
    c: float


def _stdev(xs: list[float]) -> float:
    if len(xs) < 2:
        return 0.0
    m = sum(xs) / len(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


def _rsi(closes: list[float], n: int) -> list[float | None]:
    out: list[float | None] = [None] * len(closes)
    if n < 2 or len(closes) <= n:
        return out
    avg_g = 0.0
    avg_l = 0.0
    for i in range(1, n + 1):
        d = closes[i] - closes[i - 1]
        avg_g += max(d, 0.0)
        avg_l += max(-d, 0.0)
    avg_g /= n
    avg_l /= n

    def level(g: float, l: float) -> float:
        if l == 0:
            return 100.0
        rs = g / l
        return 100.0 - 100.0 / (1.0 + rs)

    out[n] = level(avg_g, avg_l)
    for i in range(n + 1, len(closes)):
        d = closes[i] - closes[i - 1]
        avg_g = (avg_g * (n - 1) + max(d, 0.0)) / n
        avg_l = (avg_l * (n - 1) + max(-d, 0.0)) / n
        out[i] = level(avg_g, avg_l)
    return out


def _prep(bars: list[Bar], windows: list[int]) -> dict:
    closes = [b.c for b in bars]
    rets = [0.0]
    for i in range(1, len(bars)):
        prev = closes[i - 1]
        rets.append(closes[i] / prev - 1.0 if prev else 0.0)
    pack: dict[int, dict] = {}
    for w in sorted(set(max(1, x) for x in windows)):
        sma: list[float | None] = [None] * len(bars)
        ret: list[float | None] = [None] * len(bars)
        vol: list[float | None] = [None] * len(bars)
        med: list[float | None] = [None] * len(bars)
        phi: list[float | None] = [None] * len(bars)
        plo: list[float | None] = [None] * len(bars)
        vols: list[float] = []
        for i in range(len(bars)):
            if i + 1 >= w:
                sma[i] = sum(closes[i - w + 1 : i + 1]) / w
            if i >= w and closes[i - w]:
                ret[i] = closes[i] / closes[i - w] - 1.0
            if i >= w:
                vol[i] = _stdev(rets[i - w + 1 : i + 1])
                vols.append(vol[i] or 0.0)
                window = vols[-w:]
                ordered = sorted(window)
                med[i] = ordered[len(ordered) // 2]
                phi[i] = max(b.h for b in bars[i - w : i])
                plo[i] = min(b.l for b in bars[i - w : i])
        pack[w] = {"sma": sma, "ret": ret, "vol": vol, "med": med, "hi": phi, "lo": plo, "rsi": _rsi(closes, w)}
    return pack


def _on(rule: Rule, i: int, bars: list[Bar], pack: dict, events: list[tuple[str, int]]) -> bool:
    if rule.kind == "always":
        return True
    w = max(1, rule.window)
    slot = pack.get(w) or pack[max(pack)]
    if i >= len(bars):
        return False
    if rule.kind == "sma_cross":
        sma = slot["sma"]
        if i < 1 or sma[i] is None or sma[i - 1] is None:
            return False
        return bars[i].c > sma[i] and bars[i - 1].c <= sma[i - 1]
    if rule.kind == "return_gt":
        val = slot["ret"][i]
        return val is not None and val > (rule.threshold if rule.threshold is not None else 0.0)
    if rule.kind == "return_lt":
        val = slot["ret"][i]
        return val is not None and val < (rule.threshold if rule.threshold is not None else 0.0)
    if rule.kind == "price_above_sma":
        sma = slot["sma"][i]
        return sma is not None and bars[i].c > sma
    if rule.kind == "price_below_sma":
        sma = slot["sma"][i]
        return sma is not None and bars[i].c < sma
    if rule.kind == "vol_below_median":
        vol, med = slot["vol"][i], slot["med"][i]
        return vol is not None and med is not None and vol < med
    if rule.kind == "vol_above_median":
        vol, med = slot["vol"][i], slot["med"][i]
        return vol is not None and med is not None and vol > med
    if rule.kind == "breakout_high":
        hi = slot["hi"][i]
        return hi is not None and bars[i].c > hi
    if rule.kind == "breakdown_low":
        lo = slot["lo"][i]
        return lo is not None and bars[i].c < lo
    if rule.kind == "rsi_lt":
        rsi = slot["rsi"][i]
        return rsi is not None and rsi < (rule.threshold if rule.threshold is not None else 30.0)
    if rule.kind == "rsi_gt":
        rsi = slot["rsi"][i]
        return rsi is not None and rsi > (rule.threshold if rule.threshold is not None else 70.0)
    if rule.kind == "event_bias":
        want = 1 if (rule.threshold is None or rule.threshold >= 0) else -1
        day = bars[i].t
        for date, bias in events:
            if bias != want or date > day:
                continue
            if _days_between(date, day) <= w:
                return True
        return False
    return False


def _days_between(a: str, b: str) -> int:
    from datetime import date

    da = date.fromisoformat(a[:10])
    db = date.fromisoformat(b[:10])
    return (db - da).days


def _all(rules: list[Rule], i: int, bars: list[Bar], pack: dict, events: list[tuple[str, int]]) -> bool:
    return bool(rules) and all(_on(r, i, bars, pack, events) for r in rules)


def _windows(spec: DeskSpec) -> list[int]:
    found = [1]
    for group in (spec.entry, spec.entry_short, spec.exit_rules):
        found.extend(max(1, r.window) for r in group)
    return found


def _clean(bars: list[Bar]) -> list[Bar]:
    dedup: dict[str, Bar] = {}
    for b in sorted(bars, key=lambda x: x.t):
        o, h, l, c = b.o, b.h, b.l, b.c
        if min(o, h, l, c) <= 0 or not all(math.isfinite(x) for x in (o, h, l, c)):
            continue
        dedup[b.t[:10]] = Bar(b.t[:10], o, max(h, o, c), min(l, o, c), c)
    return [dedup[k] for k in sorted(dedup)]


def simulate(bars: list[Bar], spec: DeskSpec, initial: float = 100_000.0) -> dict:
    bars = _clean(bars)
    if len(bars) < 3:
        raise ValueError("Need at least three daily bars")
    pack = _prep(bars, _windows(spec))
    events = [(e.date[:10], 1 if e.bias >= 0 else -1) for e in spec.events]
    warmup = max(_windows(spec))
    cash = initial
    shares = 0.0
    pos = 0
    entry_px = 0.0
    entry_i = 0
    peak = 0.0
    trough = 0.0
    pending: tuple[str, int, str] | None = None
    equity_prev = initial
    prev_close = bars[0].c
    tape: list[dict] = []

    for i, bar in enumerate(bars):
        opened = False
        closed = False
        fills: list[dict] = []
        reason_exit = ""

        if pending and i > 0:
            kind, side, why = pending
            if kind == "enter" and pos == 0 and bar.o > 0:
                qty = math.floor(cash / bar.o)
                if qty >= 1:
                    if side > 0:
                        cash -= qty * bar.o
                        shares = float(qty)
                        fills.append({"side": "BUY", "price": bar.o, "reason": why, "qty": qty})
                    else:
                        cash += qty * bar.o
                        shares = -float(qty)
                        fills.append({"side": "SELL", "price": bar.o, "reason": why, "qty": qty})
                    pos = side
                    entry_px = bar.o
                    entry_i = i
                    peak = bar.o
                    trough = bar.o
                    opened = True
            elif kind == "exit" and pos != 0 and bar.o > 0:
                reason_exit = why
                _flatten(fills, pos, shares, bar.o, why)
                cash, shares, pos = _close_cash(cash, shares, bar.o)
                closed = True
            pending = None

        if pos != 0:
            stopped = _bracket(spec, pos, entry_px, peak, trough, bar)
            if stopped:
                px, why = stopped
                _flatten(fills, pos, shares, px, why)
                cash, shares, pos = _close_cash(cash, shares, px)
                closed = True
                reason_exit = why
            else:
                peak = max(peak, bar.h)
                trough = min(trough, bar.l)
                # Entry session counts as one. Exit fills the next open.
                if spec.max_hold_bars and i - entry_i + 1 >= spec.max_hold_bars:
                    pending = ("exit", 0, "time")

        mark = bar.c
        equity = cash + shares * mark
        gross = (equity / equity_prev - 1.0) if equity_prev else 0.0
        asset = (bar.c / prev_close - 1.0) if prev_close else 0.0
        tape.append(
            {
                "t": bar.t[:10],
                "asset": asset,
                "gross": gross,
                "pos": pos,
                "turn": len(fills),
                "px": fills[-1]["price"] if fills else bar.c,
                "opened": opened,
                "closed": closed,
                "reason": reason_exit or (fills[0]["reason"] if fills else ""),
                "fills": fills,
            }
        )
        equity_prev = equity
        prev_close = bar.c

        if i < warmup:
            continue
        if pending:
            continue
        long_on = spec.direction in ("long", "both") and _all(spec.entry, i, bars, pack, events)
        short_rules = spec.entry_short or spec.entry
        short_on = (
            spec.direction in ("short", "both")
            and bool(spec.entry_short or spec.direction == "short")
            and _all(short_rules, i, bars, pack, events)
        )
        if spec.direction == "both" and long_on and short_on:
            long_on = short_on = False
        if pos == 0:
            if long_on:
                pending = ("enter", 1, "entry")
            elif short_on and spec.direction != "long":
                pending = ("enter", -1, "entry")
        elif spec.exit_mode == "signal" and _all(spec.exit_rules, i, bars, pack, events):
            pending = ("exit", 0, "signal")
        elif spec.exit_mode == "reverse":
            if pos > 0 and not long_on:
                pending = ("exit", 0, "signal")
            elif pos < 0 and not short_on:
                pending = ("exit", 0, "signal")

    return {"tape": tape, "initial": initial}


def _flatten(fills: list[dict], pos: int, shares: float, px: float, why: str) -> None:
    fills.append({"side": "SELL" if pos > 0 else "BUY", "price": px, "reason": why, "qty": abs(shares)})


def _close_cash(cash: float, shares: float, px: float) -> tuple[float, float, int]:
    # Long shares are positive: selling adds cash. Short shares are negative: covering subtracts cash.
    return cash + shares * px, 0.0, 0


def _bracket(spec: DeskSpec, pos: int, entry: float, peak: float, trough: float, bar: Bar) -> tuple[float, str] | None:
    if pos > 0:
        stop = entry * (1.0 - spec.stop_loss) if spec.stop_loss else None
        if spec.trailing_stop:
            trail = peak * (1.0 - spec.trailing_stop)
            stop = trail if stop is None else max(stop, trail)
        target = entry * (1.0 + spec.take_profit) if spec.take_profit else None
        hit_stop = stop is not None and bar.l <= stop
        hit_tgt = target is not None and bar.h >= target
        if hit_stop:
            px = bar.o if bar.o < stop else stop
            return px, "stop"
        if hit_tgt:
            px = bar.o if bar.o > target else target
            return px, "target"
        return None
    stop = entry * (1.0 + spec.stop_loss) if spec.stop_loss else None
    if spec.trailing_stop:
        trail = trough * (1.0 + spec.trailing_stop)
        stop = trail if stop is None else min(stop, trail)
    target = entry * (1.0 - spec.take_profit) if spec.take_profit else None
    hit_stop = stop is not None and bar.h >= stop
    hit_tgt = target is not None and bar.l <= target
    if hit_stop:
        px = bar.o if bar.o > stop else stop
        return px, "stop"
    if hit_tgt:
        px = bar.o if bar.o < target else target
        return px, "target"
    return None
