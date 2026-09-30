# Grok agent

Client: `agents/grok_client.py` → `XAI_API_BASE` + `XAI_API_KEY` + `XAI_MODEL`.

Tools are listed in `agents/tools/catalog.py`. Tool outputs are compact metadata and analytics, never raw bars.

Loop: hypothesis → search/inspect → create_strategy → validate_strategy → run_backtest → interpret.

If the key is missing, `fallback_spec()` supplies a valid DSL object and the engine still runs. The UI labels that path.

Grok is not allowed to compute P&L, Sharpe, Sortino, drawdown, fills, size, settlement, or returns.
