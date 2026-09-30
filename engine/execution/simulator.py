from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from engine.schema import ExecutionSpec, Side, SLIPPAGE_BPS, SlippageModel


@dataclass
class Fill:
    price: float
    quantity: float
    fees: float
    slippage: float
    fill_ts: datetime
    model: str


class ExecutionSimulator:
    def __init__(self, spec: ExecutionSpec):
        self.spec = spec
        self.slippage_bps = SLIPPAGE_BPS.get(spec.slippage, SLIPPAGE_BPS[SlippageModel.CONSERVATIVE])

    def latency_delta(self) -> timedelta:
        return timedelta(milliseconds=self.spec.latency_ms)

    def apply_latency(self, ts: datetime) -> datetime:
        return ts + self.latency_delta()

    def fill(
        self,
        side: Side,
        intended_price: float,
        quantity: float,
        bid: float | None,
        ask: float | None,
        signal_ts: datetime,
    ) -> Fill:
        raw = intended_price
        if self.spec.model == "market":
            if side == Side.BUY and ask is not None:
                raw = ask
            elif side == Side.SELL and bid is not None:
                raw = bid
        slip = raw * (self.slippage_bps / 10_000.0)
        if side == Side.BUY:
            px = raw + slip
        else:
            px = max(0.0, raw - slip)
        if 0 <= intended_price <= 1.0 and px > 1.0:
            px = 1.0
        if 0 <= intended_price <= 1.0 and px < 0.0:
            px = 0.0
        notional = abs(px * quantity)
        fees = notional * (self.spec.fee_bps / 10_000.0)
        return Fill(
            price=px,
            quantity=quantity,
            fees=fees,
            slippage=abs(slip * quantity),
            fill_ts=self.apply_latency(signal_ts),
            model=self.spec.model,
        )
