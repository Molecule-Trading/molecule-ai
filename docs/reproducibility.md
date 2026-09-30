# Reproducibility

A completed run stores:

- strategy specification + fingerprint
- dataset ids, data_version, checksum, synthetic flag
- engine_version and feature_version
- latency, fees, slippage, capital

Golden tests replay fixture events twice and require identical net P&L, trade count, and ending equity.

Fixture data is always labelled synthetic in catalog metadata, API summaries, and the markets UI.
