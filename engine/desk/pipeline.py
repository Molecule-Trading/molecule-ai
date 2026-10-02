from __future__ import annotations

from agents.grok_client import GrokClient
from data.alpaca.bars import AlpacaBars
from engine.desk.parse import parse_thesis
from engine.desk.report import report
from engine.desk.schema import DeskSpec
from engine.desk.simulate import Bar, simulate


def run_thesis(
    hypothesis: str,
    *,
    xai_key: str,
    xai_model: str,
    xai_base: str,
    alpaca_key: str,
    alpaca_secret: str,
    attachment: str | None = None,
) -> dict:
    if not xai_key:
        raise RuntimeError("XAI_API_KEY is not set")
    if not alpaca_key or not alpaca_secret:
        raise RuntimeError("ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY are not set. No sample curve was substituted.")
    spec = parse_thesis(GrokClient(xai_key, xai_model, xai_base), hypothesis, attachment)
    rows = AlpacaBars(alpaca_key, alpaca_secret).daily(spec.asset_class, spec.symbol, spec.start, spec.end)
    bars = [Bar(r["t"], r["o"], r["h"], r["l"], r["c"]) for r in rows]
    out = simulate(bars, spec)
    analytics = report(out["tape"])
    return {
        "tape": out["tape"],
        "assumptions": _assumptions(spec, bars, analytics),
        "spec": spec.model_dump(),
        "notes": spec.notes,
        "untested": spec.untested,
        "symbol": spec.symbol,
        "name": spec.name,
        "rows": len(bars),
        "analytics": analytics,
    }


def _assumptions(spec: DeskSpec, bars: list[Bar], analytics: dict) -> list[list[str]]:
    entry = ", ".join(f"{r.kind}({r.window})" for r in spec.entry) or "—"
    risk = []
    if spec.stop_loss:
        risk.append(f"stop {spec.stop_loss:.2%}")
    if spec.take_profit:
        risk.append(f"target {spec.take_profit:.2%}")
    if spec.trailing_stop:
        risk.append(f"trail {spec.trailing_stop:.2%}")
    if spec.max_hold_bars:
        risk.append(f"max hold {spec.max_hold_bars} sessions")
    rows = [
        ["Symbol", spec.symbol],
        ["Class", spec.asset_class],
        ["Direction", spec.direction],
        ["Entry", entry],
        ["Exit", spec.exit_mode],
        ["Risk", ", ".join(risk) or "none"],
        ["Sample", f"{bars[0].t} → {bars[-1].t}"],
        ["Fill", "signal at close, fill next open; stop before target"],
        ["Costs", "not in the tape; sliders default to 0.10% fee and 0.05% slippage per fill"],
        ["Capital", "100,000"],
        ["Data", "Alpaca daily bars"],
    ]
    if analytics.get("open_marked"):
        rows.append(["Open trade", "still open, marked to the last close"])
    if spec.untested:
        rows.append(["Not tested", "; ".join(spec.untested)])
    if spec.notes:
        rows.append(["Spec", spec.notes])
    return rows
