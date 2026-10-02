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
    return raw.replace("/", ".")


def _num(row: dict, *keys: str) -> float | None:
    for key in keys:
        if key not in row or row[key] is None:
            continue
        try:
            return float(row[key])
        except (TypeError, ValueError):
            continue
    return None


def extract_ohlc(body, symbol: str) -> list[dict]:
    """Pull a close line out of a bars payload or any OHLC list. Missing open/high/low become the close."""
    lists: list[list] = []
    if isinstance(body, list):
        lists.append(body)
    elif isinstance(body, dict):
        bars = body.get("bars")
        wanted = symbol.replace("/", "").replace("-", "")
        if isinstance(bars, dict):
            for key, val in bars.items():
                if not isinstance(val, list):
                    continue
                flat = str(key).replace("/", "").replace("-", "")
                if flat == wanted or len(bars) == 1:
                    lists.append(val)
        elif isinstance(bars, list):
            lists.append(bars)
        for key in ("quotes", "ohlc", "data", "results"):
            val = body.get(key)
            if isinstance(val, list):
                lists.append(val)
            elif isinstance(val, dict):
                for item in val.values():
                    if isinstance(item, list):
                        lists.append(item)
    out: list[dict] = []
    seen: set[str] = set()
    for rows in lists:
        for row in rows:
            if not isinstance(row, dict):
                continue
            t = str(row.get("t") or row.get("timestamp") or row.get("time") or "")[:10]
            close = _num(row, "c", "close", "price")
            if len(t) < 10 or close is None or close <= 0:
                continue
            o = _num(row, "o", "open") or close
            h = _num(row, "h", "high") or max(o, close)
            l = _num(row, "l", "low") or min(o, close)
            if min(o, h, l, close) <= 0 or t in seen:
                continue
            seen.add(t)
            out.append({"t": t, "o": o, "h": max(h, o, close), "l": min(l, o, close), "c": close})
    out.sort(key=lambda r: r["t"])
    return out


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
        if asset_class == "forex":
            rows = self._forex(symbol, start_d, end_d)
        elif asset_class == "stock":
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
        else:
            raise AlpacaError(f"Unsupported asset class {asset_class}")
        if len(rows) < 3:
            raise AlpacaError(f"Alpaca returned {len(rows)} daily bars for {symbol}. An ETF was not substituted.")
        return rows

    def _forex(self, symbol: str, start: date, end: date) -> list[dict]:
        slash = f"{symbol[:3]}/{symbol[3:]}" if len(symbol) == 6 else symbol
        last = ""
        attempts = [slash, symbol]
        for name in attempts:
            try:
                rows = self._pages(
                    f"{self._base}/v1beta1/forex/bars",
                    {"symbols": name, "timeframe": "1Day", "start": start.isoformat(), "end": end.isoformat(), "limit": 10000},
                )
            except AlpacaError as exc:
                last = str(exc)
                if any(code in last for code in (" 400 ", " 403 ", " 404 ", "Alpaca 400", "Alpaca 403", "Alpaca 404")):
                    continue
                raise
            if len(rows) >= 3:
                return rows
        from data.fx.closes import daily as fx_closes
        try:
            return fx_closes(symbol, start.isoformat(), end.isoformat())
        except AlpacaError as exc:
            raise AlpacaError(f"No OHLC for {symbol}. An ETF was not substituted. {exc}") from exc

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
                out.extend(extract_ohlc(body, symbol))
                token = body.get("next_page_token")
                if not token:
                    break
        out.sort(key=lambda r: r["t"])
        # Drop duplicate sessions, keep the last print.
        dedup: dict[str, dict] = {}
        for row in out:
            dedup[row["t"]] = row
        return [dedup[k] for k in sorted(dedup)]
