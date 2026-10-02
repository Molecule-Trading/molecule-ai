"""Daily FX closes. Alpaca does not publish forex bars.

A close is enough for a line. Open, high, and low are that close, so a stop
cannot see an intrabar range that was never published.
"""

from __future__ import annotations

from datetime import date, timedelta

import httpx

from data.alpaca.bars import AlpacaError


def pair_of(symbol: str) -> tuple[str, str]:
    raw = symbol.strip().upper().replace("/", "").replace("-", "")
    if len(raw) != 6 or not raw.isalpha():
        raise AlpacaError(f"{symbol} is not a forex pair. No curve was substituted.")
    return raw[:3], raw[3:]


def closes_to_bars(rows: list[tuple[str, float]]) -> list[dict]:
    out = []
    for day, px in rows:
        if px <= 0:
            continue
        out.append({"t": day, "o": px, "h": px, "l": px, "c": px})
    return out


def daily(symbol: str, start: str | None, end: str | None) -> list[dict]:
    base, quote = pair_of(symbol)
    end_d = date.fromisoformat(end) if end else date.today()
    start_d = date.fromisoformat(start) if start else end_d - timedelta(days=365 * 5)
    url = f"https://api.frankfurter.app/{start_d.isoformat()}..{end_d.isoformat()}"
    try:
        resp = httpx.get(url, params={"from": base, "to": quote}, timeout=30.0)
    except httpx.HTTPError as exc:
        raise AlpacaError(f"Forex closes were not available for {base}{quote}. No curve was substituted.") from exc
    if resp.status_code >= 400:
        raise AlpacaError(f"Forex {resp.status_code} for {base}{quote}. No curve was substituted.")
    rates = (resp.json() or {}).get("rates") or {}
    rows = []
    for day, blob in rates.items():
        px = blob.get(quote) if isinstance(blob, dict) else None
        if px is None:
            continue
        rows.append((day[:10], float(px)))
    bars = closes_to_bars(sorted(rows))
    if len(bars) < 3:
        raise AlpacaError(f"Forex returned {len(bars)} closes for {base}{quote}. No curve was substituted.")
    return bars
