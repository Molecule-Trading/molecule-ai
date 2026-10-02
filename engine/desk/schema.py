from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class Rule(BaseModel):
    kind: Literal[
        "always",
        "sma_cross",
        "sma_cross_down",
        "return_gt",
        "return_lt",
        "price_above_sma",
        "price_below_sma",
        "vol_below_median",
        "vol_above_median",
        "breakout_high",
        "breakdown_low",
        "rsi_lt",
        "rsi_gt",
        "event_bias",
    ]
    window: int = 20
    threshold: float | None = None


class EventMark(BaseModel):
    date: str
    bias: Literal[-1, 1] = 1
    note: str = ""


class DeskSpec(BaseModel):
    name: str = "Desk test"
    asset_class: Literal["stock", "crypto", "forex"] = "stock"
    symbol: str
    start: str | None = None
    end: str | None = None
    direction: Literal["long", "short", "both"] = "long"
    entry: list[Rule] = Field(default_factory=lambda: [Rule(kind="always", window=1)])
    entry_short: list[Rule] = Field(default_factory=list)
    exit_rules: list[Rule] = Field(default_factory=list)
    stop_loss: float | None = None
    take_profit: float | None = None
    trailing_stop: float | None = None
    max_hold_bars: int | None = None
    exit_mode: Literal["reverse", "bracket", "signal"] = "reverse"
    events: list[EventMark] = Field(default_factory=list)
    notes: str = ""
    untested: list[str] = Field(default_factory=list)
