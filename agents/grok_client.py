from __future__ import annotations

import json
from typing import Any

import httpx


class GrokClient:
    def __init__(self, api_key: str, model: str, base_url: str = "https://api.x.ai/v1"):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def chat(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        temperature: float = 0.2,
        max_tokens: int = 1800,
    ) -> dict:
        if not self.enabled:
            raise RuntimeError("XAI_API_KEY is not configured")
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        with httpx.Client(timeout=90.0) as client:
            resp = client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    def message_text(self, response: dict) -> str:
        choices = response.get("choices") or []
        if not choices:
            return ""
        msg = choices[0].get("message") or {}
        return msg.get("content") or ""

    def tool_calls(self, response: dict) -> list[dict]:
        choices = response.get("choices") or []
        if not choices:
            return []
        msg = choices[0].get("message") or {}
        calls = msg.get("tool_calls") or []
        parsed = []
        for c in calls:
            fn = c.get("function") or {}
            args = fn.get("arguments") or "{}"
            if isinstance(args, str):
                try:
                    args = json.loads(args)
                except json.JSONDecodeError:
                    args = {}
            parsed.append(
                {
                    "id": c.get("id"),
                    "name": fn.get("name"),
                    "arguments": args,
                    "raw": c,
                }
            )
        return parsed
