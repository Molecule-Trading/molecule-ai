from __future__ import annotations

from datetime import date, timedelta

import httpx


class AlpacaError(RuntimeError):
    pass


def normalize_symbol(asset_class: str, symbol: str) -> str:
    raw = symbol.strip().upper().replace(" ", "")
    if asset_class == "crypto":
        raw = raw.replace("-", "/")
        if "/" not in raw:
            if raw.endswith("USDT"):
                raw = raw[:-4] + "/USD"
            elif raw.endswith("USD") and len(raw) > 3:
                raw = raw[:-3] + "/USD"
            else:
                raw = f"{raw}/USD"
        return raw
    if asset_class == "forex":
        return raw.replace("/", "")
    return raw.replace("/", "")


class AlpacaBars:
    def __init__(self, key_id: str, secret: str, base: str = "https://data.alpaca.markets"):
        if not key_id or not secret:
            raise AlpacaError("ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY are required")
        self._headers = {"APCA-API-KEY-ID": key_id, "APCA-API-SECRET-KEY": secret}
        self._base = base.rstrip("/")

    def daily(self, asset_class: str, symbol: str, start: str | None, end: str | None) -> list[dict]:
        symbol = normalize_symbol(asset_class, symbol)
        end_d = date.fromisoformat(end) if end else date.today()
        start_d = date.fromisoformat(start) if start else end_d - timedelta(days=365 * 5)
        if asset_class == "stock":
            rows = self._pages(
                f"{self._base}/v2/stocks/bars",
                {"symbols": symbol, "timeframe": "1Day", "start": start_d.isoformat(), "end": end_d.isoformat(), "limit": 10000, "adjustment": "all", "feed": "iex"},
            )
            if not rows:
                rows = self._pages(
                    f"{self._base}/v2/stocks/bars",
                    {"symbols": symbol, "timeframe": "1Day", "start": start_d.isoformat(), "end": end_d.isoformat(), "limit": 10000, "adjustment": "all"},
                )
        elif asset_class == "crypto":
            rows = self._pages(
                f"{self._base}/v1beta3/crypto/us/bars",
                {"symbols": symbol, "timeframe": "1Day", "start": start_d.isoformat(), "end": end_d.isoformat(), "limit": 10000},
            )
        elif asset_class == "forex":
            rows = self._pages(
                f"{self._base}/v1beta1/forex/bars",
                {"symbols": symbol, "timeframe": "1Day", "start": start_d.isoformat(), "end": end_d.isoformat(), "limit": 10000},
            )
        else:
            raise AlpacaError(f"Unsupported asset class {asset_class}")
        if len(rows) < 3:
            raise AlpacaError(f"Alpaca returned {len(rows)} daily bars for {symbol}")
        return rows

    def _pages(self, url: str, params: dict) -> list[dict]:
        symbol = params["symbols"]
        out: list[dict] = []
        token = None
        with httpx.Client(timeout=30.0) as client:
            for _ in range(20):
                query = dict(params)
                if token:
                    query["page_token"] = token
                resp = client.get(url, params=query, headers=self._headers)
                if resp.status_code == 403 and "feed" in query:
                    return []
                if resp.status_code >= 400:
                    raise AlpacaError(f"Alpaca {resp.status_code} for {symbol}: {resp.text[:240]}")
                body = resp.json()
                bars = (body.get("bars") or {}).get(symbol) or []
                if not bars:
                    blob = body.get("bars") or {}
                    if len(blob) == 1:
                        bars = next(iter(blob.values())) or []
                for row in bars:
                    t = str(row.get("t") or "")[:10]
                    try:
                        o, h, l, c = float(row["o"]), float(row["h"]), float(row["l"]), float(row["c"])
                    except (KeyError, TypeError, ValueError):
                        continue
                    if min(o, h, l, c) <= 0:
                        continue
                    out.append({"t": t, "o": o, "h": h, "l": l, "c": c})
                token = body.get("next_page_token")
                if not token:
                    break
        out.sort(key=lambda r: r["t"])
        # Drop duplicate sessions, keep the last print.
        dedup: dict[str, dict] = {}
        for row in out:
            dedup[row["t"]] = row
        return [dedup[k] for k in sorted(dedup)]
