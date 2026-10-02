from __future__ import annotations

import json
from datetime import date

from agents.grok_client import GrokClient
from engine.desk.schema import DeskSpec

_SYSTEM = """You translate a trading thesis into one daily-bar test. Reply with JSON only, no markdown.
Do not invent returns, Sharpe, or trade counts. You only choose the rule.
Schema:
{
  "name": "short name",
  "asset_class": "stock" | "crypto" | "forex",
  "symbol": "AAPL or BTC/USD or EURUSD",
  "start": "YYYY-MM-DD or null",
  "end": "YYYY-MM-DD or null",
  "direction": "long" | "short" | "both",
  "entry": [{"kind": "...", "window": 20, "threshold": null}],
  "entry_short": [],
  "exit_rules": [],
  "stop_loss": null,
  "take_profit": null,
  "trailing_stop": null,
  "max_hold_bars": null,
  "exit_mode": "reverse" | "bracket" | "signal",
  "events": [{"date": "YYYY-MM-DD", "bias": 1, "note": ""}],
  "notes": "what is being tested",
  "untested": ["parts of the thesis daily prices cannot decide"]
}
Rule kind is one of: always, sma_cross, sma_cross_down, return_gt, return_lt, price_above_sma, price_below_sma, vol_below_median, vol_above_median, breakout_high, breakdown_low, rsi_lt, rsi_gt, event_bias.
threshold is a return fraction (0.01 = 1%), an RSI level, or 1/-1 for event_bias. stop_loss, take_profit, trailing_stop are fractions (0.02 = 2%).
sma_cross is a close crossing above its average. sma_cross_down is a close crossing under its average. Shorts use sma_cross_down, price_below_sma, breakdown_low, rsi_gt, or return_lt. Never use sma_cross to open a short.
Use exit_mode reverse when the position should stay open only while the entry rule is true.
A cross or breakout is true for one session only. If the trade should stay open after that cross, use price_above_sma or price_below_sma with exit_mode reverse, or use exit_mode bracket with a stop, target, or trail.
Use bracket when the thesis is an entry plus stop, target, or trailing stop and there is no separate exit rule.
Use signal when exit_rules are the exit. Stops, targets, and trails still fill inside the bar.
asset_class forex is only for a currency pair. Do not remap EURUSD or any FX pair onto a stock or ETF. Alpaca has no forex bars; the engine will refuse that test.
If the thesis cites a speech, release, or earnings date you know, put that exact date in events and add an event_bias entry rule with threshold 1 or -1. If you do not know the date, put the reason in untested and do not invent a date.
One symbol only. The symbol is the instrument that is bought or sold. Stocks use a ticker. Crypto uses BTC/USD. Forex uses EURUSD.
stop_loss, take_profit, and trailing_stop are fractions of price (0.02 means 2 percent). window is sessions, except event_bias where window is calendar days after the event, including the event date.
Do not put a number you were not given into notes.
"""


def parse_thesis(client: GrokClient, hypothesis: str, attachment: str | None = None) -> DeskSpec:
    user = hypothesis.strip()
    if attachment:
        user += "\n\nAttached material:\n" + attachment[:120_000]
    raw = client.chat(
        [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": user},
        ],
        temperature=0.0,
        max_tokens=1800,
    )
    text = client.message_text(raw).strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end < start:
        raise ValueError("The model did not return a strategy spec")
    payload = json.loads(text[start : end + 1])
    spec = normalize_spec(DeskSpec.model_validate(payload))
    if not spec.symbol.strip():
        raise ValueError("The model did not name a symbol")
    return spec


_ONE_BAR = {"sma_cross", "sma_cross_down", "breakout_high", "breakdown_low"}


def normalize_spec(spec: DeskSpec) -> DeskSpec:
    raw = spec.model_dump()
    notes: list[str] = []
    for key in ("stop_loss", "take_profit", "trailing_stop"):
        raw[key] = _fraction(key, raw.get(key), notes)
    for group in ("entry", "entry_short", "exit_rules"):
        for rule in raw[group]:
            window = int(rule.get("window") or 1)
            if window < 1:
                window = 1
            if window > 504:
                notes.append(f"{rule['kind']} window capped at 504 sessions")
                window = 504
            rule["window"] = window
    if not raw["entry"]:
        raise ValueError("The thesis did not produce an entry rule")
    one_bar = all(r["kind"] in _ONE_BAR for r in raw["entry"])
    has_risk = any(raw[k] for k in ("stop_loss", "take_profit", "trailing_stop"))
    if one_bar and has_risk and raw["exit_mode"] == "reverse" and not raw["exit_rules"]:
        raw["exit_mode"] = "bracket"
        notes.append("A cross is one session, so the position is held with the stop or target.")
    if raw["exit_rules"] and raw["exit_mode"] != "signal":
        raw["exit_mode"] = "signal"
        notes.append("Exit rules are applied. Stops and targets still fill inside the bar.")
    if raw["direction"] == "short":
        flipped = False
        for rule in raw["entry"]:
            if rule["kind"] == "sma_cross":
                rule["kind"] = "sma_cross_down"
                flipped = True
        if flipped:
            notes.append("Short entry uses the cross under the average.")
    if raw["direction"] == "both" and not raw["entry_short"]:
        notes.append("No short entry was given, so only longs are taken.")
    kept = []
    for ev in raw["events"]:
        try:
            date.fromisoformat(str(ev["date"])[:10])
            ev["date"] = str(ev["date"])[:10]
            kept.append(ev)
        except ValueError:
            raw["untested"].append(f"Dropped an event with no real date ({ev.get('note') or ev.get('date')})")
    raw["events"] = kept
    extra = " ".join(notes)
    if extra:
        raw["notes"] = f"{raw.get('notes') or ''} {extra}".strip()
    return DeskSpec.model_validate(raw)


def _fraction(name: str, value, notes: list[str]) -> float | None:
    if value is None:
        return None
    number = float(value)
    if number == 0:
        return None
    if number < 0:
        raise ValueError(f"{name} cannot be negative")
    if number > 1:
        if number <= 100:
            notes.append(f"{name} {number:g} was read as {number:g} percent")
            number = number / 100.0
        else:
            raise ValueError(f"{name} {number:g} is not a usable fraction")
    if number >= 1:
        raise ValueError(f"{name} must be under 100 percent")
    return number
