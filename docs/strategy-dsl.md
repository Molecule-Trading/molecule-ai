# Strategy DSL

`engine.schema.StrategySpec` is the contract.

Required:

- `universe.reference` / `universe.target` (venue + identity)
- `signal.type` and `threshold` / `window`
- `entry.action` + `entry.outcome`
- `exit.type`
- `execution.latency_ms`, `execution.slippage`, `execution.fee_bps`
- `capital.initial`

Supported signal types: momentum, return_threshold, volatility_shock, probability_momentum, probability_mean_reversion, cross_venue_divergence, lead_lag, always.

Exit types: SETTLEMENT, SIGNAL_REVERSE, TIME, STOP.

Lookahead is structural: features are updated from events with timestamp ≤ t, then the signal is evaluated.
