"""Compact tool schemas exposed to Grok. Outputs are summarized, never raw series."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_markets",
            "description": "Search catalogued or live public markets on BINANCE, KALSHI, or POLYMARKET. Returns compact metadata only.",
            "parameters": {
                "type": "object",
                "properties": {
                    "venue": {"type": "string", "enum": ["BINANCE", "KALSHI", "POLYMARKET"]},
                    "query": {"type": "string"},
                    "limit": {"type": "integer", "default": 10},
                },
                "required": ["venue"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "inspect_market",
            "description": "Inspect a single market and its dataset availability / quality summary.",
            "parameters": {
                "type": "object",
                "properties": {
                    "venue": {"type": "string"},
                    "instrument": {"type": "string"},
                },
                "required": ["venue", "instrument"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_datasets",
            "description": "List ingested historical datasets with row counts and quality status. Never returns raw rows.",
            "parameters": {"type": "object", "properties": {"venue": {"type": "string"}}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_strategy",
            "description": "Submit a structured StrategySpec. Must match the Molecule strategy DSL. Not Python.",
            "parameters": {
                "type": "object",
                "properties": {"spec": {"type": "object"}},
                "required": ["spec"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "validate_strategy",
            "description": "Validate the current strategy against available datasets.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_backtest",
            "description": "Run the deterministic backtest engine on the validated strategy. Returns compact analytics only.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_sensitivity",
            "description": "Deterministic parameter grid: windows, latency, slippage. Returns comparison table.",
            "parameters": {
                "type": "object",
                "properties": {
                    "windows": {"type": "array", "items": {"type": "string"}},
                    "latencies_ms": {"type": "array", "items": {"type": "integer"}},
                    "slippages": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_results",
            "description": "Fetch compact analytics and assumptions for the current run.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


SYSTEM_PROMPT = """You are the Molecule AI research agent.
You convert a natural-language crypto / prediction-market hypothesis into a structured StrategySpec,
then call deterministic Molecule tools. You never compute P&L, Sharpe, Sortino, drawdown, fills,
position sizes, settlement, returns, or execution results yourself.

Rules:
- Use only the provided tools.
- Never emit Python or SQL.
- StrategySpec must follow the DSL (universe, signal, entry, exit, execution, capital).
- Prefer ingested datasets. If data is synthetic/fixture, say so explicitly.
- Keep tool arguments compact.
- After backtest results arrive, interpret them cautiously. Distinguish BACKTEST RESULTS from your ANALYSIS.
- If validation fails, fix the spec and re-validate. Do not invent missing history.
"""
