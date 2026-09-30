from __future__ import annotations

import json
from typing import Any, Callable

from agents.grok_client import GrokClient
from agents.tools.catalog import SYSTEM_PROMPT, TOOLS
from engine.schema import StrategySpec


class ResearchAgent:
    def __init__(self, client: GrokClient, dispatch: Callable[[str, dict], dict], max_steps: int = 8):
        self.client = client
        self.dispatch = dispatch
        self.max_steps = max_steps

    def run(self, hypothesis: str, on_event: Callable[[str, dict], None] | None = None) -> dict:
        messages: list[dict] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Hypothesis:\n"
                    f"{hypothesis}\n\n"
                    "Search available markets/datasets, draft a StrategySpec, validate, "
                    "backtest if valid, then interpret compact results. "
                    "Do not request raw history."
                ),
            },
        ]
        trace: list[dict] = []
        spec: dict | None = None
        last_text = ""

        for step in range(self.max_steps):
            if on_event:
                on_event("llm", {"step": step})
            response = self.client.chat(messages, tools=TOOLS)
            calls = self.client.tool_calls(response)
            text = self.client.message_text(response)
            if text:
                last_text = text
            assistant_msg = (response.get("choices") or [{}])[0].get("message") or {}
            messages.append(assistant_msg if assistant_msg.get("role") else {"role": "assistant", "content": text})

            if not calls:
                break

            for call in calls:
                name = call["name"]
                args = call["arguments"] or {}
                if on_event:
                    on_event("tool", {"name": name})
                result = self.dispatch(name, args)
                if name == "create_strategy" and result.get("accepted"):
                    spec = result.get("spec")
                trace.append({"tool": name, "ok": result.get("ok", True)})
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call["id"],
                        "content": json.dumps(_compact(result)),
                    }
                )

        return {"analysis": last_text, "spec": spec, "trace": trace}


def fallback_spec(hypothesis: str) -> StrategySpec:
    """Deterministic default used when XAI_API_KEY is absent.

    Still a structured spec — never executable model output.
    """
    return StrategySpec.model_validate(
        {
            "name": "btc_move_pm_reprice",
            "hypothesis": hypothesis,
            "universe": {
                "reference": {"venue": "BINANCE", "symbol": "BTCUSDT"},
                "target": {"venue": "KALSHI", "market_id": "BTC-MOVE-FIXTURE", "ticker": "BTC-MOVE-FIXTURE"},
            },
            "data": {"timeframe": "5m", "require_settlement": True},
            "signal": {
                "type": "momentum",
                "window": "5m",
                "threshold": 0.01,
                "source": "reference",
                "direction": "abs",
            },
            "entry": {"action": "BUY", "outcome": "YES"},
            "exit": {"type": "SETTLEMENT"},
            "sizing": {"type": "fixed_notional", "notional": 1000},
            "execution": {"latency_ms": 100, "slippage": "conservative", "fee_bps": 10},
            "capital": {"initial": 100000},
        }
    )


def _compact(result: dict, limit: int = 4000) -> dict:
    raw = json.dumps(result, default=str)
    if len(raw) <= limit:
        return result
    return {"truncated": True, "preview": raw[:limit], "keys": list(result.keys())}
