"""Event-driven deterministic backtest.

A signal at time t may only use information with timestamp <= t.
Orders are queued until the first market event at or after t + latency.
Fill price uses the book observed at fill time, not the signal-time book.
Missing bars are not interpolated.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from engine import ENGINE_VERSION, FEATURE_VERSION
from engine.analytics.metrics import AnalyticsEngine
from engine.execution.simulator import ExecutionSimulator
from engine.features.engine import FeatureEngine, window_to_bars
from engine.schema import (
    DatasetMeta,
    EquityPoint,
    EventType,
    MarketEvent,
    Outcome,
    Side,
    StrategySpec,
    TradeRecord,
    Venue,
)
from engine.settlement.binary import settlement_cash
from engine.signals import evaluate_signal


@dataclass
class OpenPosition:
    market_id: str
    venue: Venue
    outcome: Outcome
    quantity: float
    avg_price: float
    fees_paid: float
    opened_ts: datetime
    trade_ids: list[str] = field(default_factory=list)


@dataclass
class PendingOrder:
    side: Side
    outcome: Outcome
    quantity: float
    signal_ts: datetime
    earliest_fill: datetime
    reason: str


@dataclass
class BacktestResult:
    trades: list[TradeRecord]
    equity_curve: list[EquityPoint]
    analytics: object
    assumptions: dict
    data_quality: dict
    engine_version: str
    feature_version: str
    dataset_versions: list[dict]
    signal_series: list[dict]
    warnings: list[str]


class Portfolio:
    def __init__(self, cash: float):
        self.cash = cash
        self.position: OpenPosition | None = None
        self.realized = 0.0

    def mark(self, last_price: float | None) -> float:
        if self.position is None or last_price is None:
            return 0.0
        return (last_price - self.position.avg_price) * self.position.quantity


class BacktestEngine:
    def __init__(self, spec: StrategySpec):
        self.spec = spec
        self.exec = ExecutionSimulator(spec.execution)
        bars = window_to_bars(spec.signal.window, _bar_seconds(spec.data.timeframe))
        self.features = FeatureEngine(window_bars=max(bars, spec.signal.lookback_bars, 1))
        self.portfolio = Portfolio(spec.capital.initial)
        self.trades: list[TradeRecord] = []
        self.equity: list[EquityPoint] = []
        self.signals: list[dict] = []
        self.warnings: list[str] = []
        self._peak = spec.capital.initial
        self._trade_seq = 0
        self._last_target_px: float | None = None
        self._last_target_bid: float | None = None
        self._last_target_ask: float | None = None
        self._target_resolution: Outcome | None = None
        self._settled = False
        self._pending: list[PendingOrder] = []

    def run(
        self,
        events: list[MarketEvent],
        datasets: list[DatasetMeta],
    ) -> BacktestResult:
        events = sorted(events, key=lambda e: (e.timestamp, e.sequence or 0))
        ref_keys = self._keys(self.spec.universe.reference)
        tgt_keys = self._keys(self.spec.universe.target)
        latency = timedelta(milliseconds=self.spec.execution.latency_ms)

        for ev in events:
            self.features.on_event(ev)
            if self._is_target(ev, tgt_keys) and ev.event_type != EventType.SETTLEMENT:
                px = ev.close if ev.close is not None else ev.price
                if px is not None:
                    self._last_target_px = px
                if ev.bid is not None:
                    self._last_target_bid = ev.bid
                if ev.ask is not None:
                    self._last_target_ask = ev.ask

            self._drain_pending(ev.timestamp)

            if ev.event_type == EventType.SETTLEMENT:
                if ev.resolution:
                    winner = ev.resolution.upper()
                    if winner in ("YES", "NO"):
                        self._target_resolution = Outcome(winner)
                    else:
                        self.warnings.append(
                            f"Settlement event at {ev.timestamp.isoformat()} has unusable resolution {ev.resolution!r}"
                        )
                self._maybe_settle(ev.timestamp)
                self._mark(ev.timestamp)
                continue

            if self._blocked(ev.timestamp):
                self._mark(ev.timestamp)
                continue

            ref_snap = self._snap(ref_keys, ev.timestamp)
            tgt_snap = self._snap(tgt_keys, ev.timestamp)
            fired = evaluate_signal(self.spec.signal, ref_snap, tgt_snap)
            if fired:
                self.signals.append(
                    {
                        "timestamp": ev.timestamp.isoformat(),
                        "reference_return": ref_snap.get("return"),
                        "target_price": tgt_snap.get("price"),
                    }
                )
                self._queue_entry(ev.timestamp, latency)

            if self.spec.exit.type == "SIGNAL_REVERSE" and self.portfolio.position and not fired:
                self._close_market(ev.timestamp, reason="signal_reverse")

            self._mark(ev.timestamp)

        if self._pending:
            last_ts = events[-1].timestamp if events else datetime.utcnow()
            self._drain_pending(last_ts + latency)
            leftover = [p for p in self._pending if p.earliest_fill > last_ts]
            if leftover:
                self.warnings.append(
                    f"{len(leftover)} order(s) unfilled at end of data (latency past last event)"
                )
            self._pending = []

        if self.portfolio.position and self._target_resolution:
            last_ts = events[-1].timestamp if events else datetime.utcnow()
            self._maybe_settle(last_ts)
        elif self.portfolio.position:
            last_ts = events[-1].timestamp if events else datetime.utcnow()
            self.warnings.append(
                "Position still open at end of data; no resolution available — not inferred."
            )
            self._mark(last_ts)

        analytics = AnalyticsEngine().compute(
            initial=self.spec.capital.initial,
            equity=self.equity,
            trades=self.trades,
        )
        return BacktestResult(
            trades=self.trades,
            equity_curve=self.equity,
            analytics=analytics,
            assumptions={
                "initial_capital": self.spec.capital.initial,
                "latency_ms": self.spec.execution.latency_ms,
                "slippage": self.spec.execution.slippage.value,
                "fees_bps": self.spec.execution.fee_bps,
                "execution_model": self.spec.execution.model,
                "timeframe": self.spec.data.timeframe,
                "engine_version": ENGINE_VERSION,
            },
            data_quality={
                "datasets": [d.dataset_id for d in datasets],
                "warnings": [w for d in datasets for w in d.warnings] + self.warnings,
                "synthetic": any(d.synthetic for d in datasets),
            },
            engine_version=ENGINE_VERSION,
            feature_version=FEATURE_VERSION,
            dataset_versions=[
                {
                    "dataset_id": d.dataset_id,
                    "data_version": d.data_version,
                    "checksum": d.checksum,
                    "synthetic": d.synthetic,
                }
                for d in datasets
            ],
            signal_series=self.signals,
            warnings=self.warnings,
        )

    def _is_target(self, ev: MarketEvent, tgt_keys: set[str]) -> bool:
        k = self.features.state.key(ev)
        return k in tgt_keys or ev.market_id == self.spec.universe.target.identity()

    def _keys(self, ref) -> set[str]:
        ident = ref.identity()
        venue = ref.venue.value
        keys = {f"{venue}:{ident}"}
        if ref.outcome and ref.outcome != Outcome.NA:
            keys.add(f"{venue}:{ident}:{ref.outcome.value}")
        else:
            keys.add(f"{venue}:{ident}:YES")
        return keys

    def _snap(self, keys: set[str], now: datetime) -> dict:
        for k in keys:
            snap = self.features.state.snapshot(k, now)
            if snap.get("price") is not None or snap.get("return") is not None:
                return snap
        return {
            "price": None,
            "return": None,
            "momentum": None,
            "volatility": None,
            "implied_probability": None,
            "probability_change": None,
            "probability_momentum": None,
        }

    def _blocked(self, ts: datetime) -> bool:
        t = self.spec.time
        if t.trading_start and ts < t.trading_start:
            return True
        if t.trading_end and ts > t.trading_end:
            return True
        return False

    def _size(self) -> float:
        s = self.spec.sizing
        if s.type == "fixed_contracts":
            return s.contracts
        px = self._last_target_px or 0.5
        if px == 0:
            return 0.0
        if s.type == "percent_equity":
            equity = self.portfolio.cash + self.portfolio.mark(self._last_target_px)
            return (equity * s.percent) / px
        return s.notional / px

    def _can_open(self) -> bool:
        if self.spec.risk.max_trades and len([t for t in self.trades if t.reason == "entry"]) >= self.spec.risk.max_trades:
            return False
        if self.spec.risk.one_position and self.portfolio.position is not None:
            return False
        if self.spec.risk.one_position and any(p.reason == "entry" for p in self._pending):
            return False
        return True

    def _queue_entry(self, signal_ts: datetime, latency: timedelta) -> None:
        if not self._can_open():
            return
        qty = self._size()
        if qty <= 0:
            return
        if self._last_target_px is None:
            self.warnings.append(f"Signal at {signal_ts.isoformat()} skipped: no target price yet")
            return
        self._pending.append(
            PendingOrder(
                side=self.spec.entry.action,
                outcome=self.spec.entry.outcome,
                quantity=qty,
                signal_ts=signal_ts,
                earliest_fill=signal_ts + latency,
                reason="entry",
            )
        )

    def _drain_pending(self, now: datetime) -> None:
        still: list[PendingOrder] = []
        for order in self._pending:
            if now < order.earliest_fill:
                still.append(order)
                continue
            self._fill_order(order, now)
        self._pending = still

    def _fill_order(self, order: PendingOrder, fill_ts: datetime) -> None:
        intended = self._last_target_px
        if intended is None:
            self.warnings.append(f"Pending {order.reason} dropped: no target price at fill time")
            return
        fill = self.exec.fill(
            side=order.side,
            intended_price=intended,
            quantity=order.quantity,
            bid=self._last_target_bid,
            ask=self._last_target_ask,
            signal_ts=order.signal_ts,
        )
        fill.fill_ts = max(fill.fill_ts, fill_ts)
        signed = fill.quantity if order.side == Side.BUY else -fill.quantity
        cost = fill.price * signed + (fill.fees if order.side == Side.BUY else fill.fees)
        # BUY: cash decreases by price*qty + fees
        # SELL/short: cash increases by price*qty − fees
        if order.side == Side.BUY:
            debit = fill.price * fill.quantity + fill.fees
            if debit > self.portfolio.cash + 1e-9:
                self.warnings.append("Insufficient cash for entry")
                return
            self.portfolio.cash -= debit
        else:
            self.portfolio.cash += fill.price * fill.quantity - fill.fees

        self._trade_seq += 1
        tid = f"T{self._trade_seq:05d}"
        rec = TradeRecord(
            trade_id=tid,
            market_id=self.spec.universe.target.identity(),
            venue=self.spec.universe.target.venue,
            outcome=order.outcome,
            side=order.side,
            quantity=signed,
            price=fill.price,
            fees=fill.fees,
            slippage=fill.slippage,
            intended_ts=order.signal_ts,
            fill_ts=fill.fill_ts,
            signal_ts=order.signal_ts,
            reason=order.reason,
        )
        self.trades.append(rec)
        if order.reason == "entry":
            self._apply_fill_to_position(rec, fill.fill_ts)

    def _apply_fill_to_position(self, rec: TradeRecord, ts: datetime) -> None:
        pos = self.portfolio.position
        if pos is None:
            self.portfolio.position = OpenPosition(
                market_id=rec.market_id,
                venue=rec.venue,
                outcome=rec.outcome,
                quantity=rec.quantity,
                avg_price=rec.price,
                fees_paid=rec.fees,
                opened_ts=ts,
                trade_ids=[rec.trade_id],
            )
            return
        if pos.outcome != rec.outcome:
            self.warnings.append("Ignoring fill that mixes YES and NO in one slot")
            return
        new_qty = pos.quantity + rec.quantity
        if abs(new_qty) < 1e-12:
            self.portfolio.position = None
            return
        # weighted average on the remaining signed quantity
        if (pos.quantity > 0 and rec.quantity > 0) or (pos.quantity < 0 and rec.quantity < 0):
            abs_pos = abs(pos.quantity)
            abs_add = abs(rec.quantity)
            pos.avg_price = (pos.avg_price * abs_pos + rec.price * abs_add) / (abs_pos + abs_add)
        pos.quantity = new_qty
        pos.fees_paid += rec.fees
        pos.trade_ids.append(rec.trade_id)

    def _maybe_settle(self, ts: datetime) -> None:
        if self._settled or self.portfolio.position is None or self._target_resolution is None:
            return
        pos = self.portfolio.position
        try:
            cash_in = settlement_cash(pos.quantity, pos.outcome, self._target_resolution)
        except ValueError as exc:
            self.warnings.append(str(exc))
            return
        self.portfolio.cash += cash_in
        self._trade_seq += 1
        self.trades.append(
            TradeRecord(
                trade_id=f"T{self._trade_seq:05d}",
                market_id=pos.market_id,
                venue=pos.venue,
                outcome=pos.outcome,
                side=Side.SELL if pos.quantity > 0 else Side.BUY,
                quantity=-pos.quantity,
                price=abs(cash_in / pos.quantity) if pos.quantity else 0.0,
                fees=0.0,
                slippage=0.0,
                intended_ts=ts,
                fill_ts=ts,
                signal_ts=ts,
                reason="settlement",
            )
        )
        self.portfolio.position = None
        self._settled = True
        self._mark(ts)

    def _close_market(self, ts: datetime, reason: str) -> None:
        if self.portfolio.position is None or self._last_target_px is None:
            return
        pos = self.portfolio.position
        side = Side.SELL if pos.quantity > 0 else Side.BUY
        fill = self.exec.fill(
            side=side,
            intended_price=self._last_target_px,
            quantity=abs(pos.quantity),
            bid=self._last_target_bid,
            ask=self._last_target_ask,
            signal_ts=ts,
        )
        if side == Side.SELL:
            self.portfolio.cash += fill.price * fill.quantity - fill.fees
        else:
            debit = fill.price * fill.quantity + fill.fees
            if debit > self.portfolio.cash + 1e-9:
                self.warnings.append("Insufficient cash to cover short")
                return
            self.portfolio.cash -= debit
        self._trade_seq += 1
        self.trades.append(
            TradeRecord(
                trade_id=f"T{self._trade_seq:05d}",
                market_id=pos.market_id,
                venue=pos.venue,
                outcome=pos.outcome,
                side=side,
                quantity=-pos.quantity,
                price=fill.price,
                fees=fill.fees,
                slippage=fill.slippage,
                intended_ts=ts,
                fill_ts=fill.fill_ts,
                signal_ts=ts,
                reason=reason,
            )
        )
        self.portfolio.position = None
        self._mark(fill.fill_ts)

    def _mark(self, ts: datetime) -> None:
        unreal = self.portfolio.mark(self._last_target_px)
        equity = self.portfolio.cash + unreal
        self._peak = max(self._peak, equity)
        dd = (equity / self._peak) - 1.0 if self._peak else 0.0
        if self.equity and self.equity[-1].timestamp == ts:
            self.equity[-1] = EquityPoint(
                timestamp=ts, equity=equity, cash=self.portfolio.cash, unrealized=unreal, drawdown=dd
            )
            return
        self.equity.append(
            EquityPoint(timestamp=ts, equity=equity, cash=self.portfolio.cash, unrealized=unreal, drawdown=dd)
        )


def _bar_seconds(tf: str) -> int:
    if not tf or tf in ("tick", "event"):
        return 60
    unit = tf[-1]
    n = int(tf[:-1])
    return {"s": n, "m": n * 60, "h": n * 3600, "d": n * 86400}.get(unit, 300)
