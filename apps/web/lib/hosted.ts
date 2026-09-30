/** Static catalog + one sample record for the hosted UI when FastAPI is not attached. */

const OFFLINE =
  "This deployment is the research UI only. The Python engine did not run. Set NEXT_PUBLIC_API_URL (browser) or MOLECULE_API_ORIGIN (server proxy) to your FastAPI origin.";

const SAMPLE_ID = "fixture-btc-pm";

const stages = [
  { key: "interpret", label: "Interpret", status: "done" },
  { key: "discover", label: "Discover data", status: "done" },
  { key: "specify", label: "Specify", status: "done" },
  { key: "validate", label: "Validate", status: "done" },
  { key: "backtest", label: "Backtest", status: "done" },
  { key: "analyze", label: "Analyze", status: "done" },
];

export const sampleRun = {
  id: SAMPLE_ID,
  hypothesis:
    "Test whether a 1% BTC move over 5 minutes predicts a delayed move in BTC-related prediction markets.",
  status: "COMPLETED",
  stage: "analyze",
  stages,
  started_at: "2026-01-15T03:20:00Z",
  completed_at: "2026-01-15T03:20:01Z",
  runtime: 0.4,
  engine_version: "0.1.0",
  data_period: "2026-01-15 synthetic session",
  data_sources: ["BINANCE BTCUSDT", "KALSHI BTC-MOVE-FIXTURE"],
  dataset_versions: [
    { dataset_id: "binance-btcusdt-fixture", synthetic: true, data_version: "fixture" },
    { dataset_id: "kalshi-btc-move-fixture", synthetic: true, data_version: "fixture" },
  ],
  strategy_spec: {
    name: "btc_move_pm_reprice",
    universe: {
      reference: { venue: "BINANCE", symbol: "BTCUSDT" },
      target: { venue: "KALSHI", market_id: "BTC-MOVE-FIXTURE" },
    },
    signal: { type: "momentum", window: "5m", threshold: 0.01, source: "reference" },
    entry: { action: "BUY", outcome: "YES" },
    exit: { type: "SETTLEMENT" },
    execution: { latency_ms: 100, slippage: "none", fee_bps: 0 },
  },
  ai_analysis:
    "Sample record shipped with the UI. It is not a live backtest of this page load. Attach the API to execute the engine.",
  error: null,
  results: {
    hosted_preview: true,
    analytics: null,
    equity: [],
    trades: [],
    assumptions: {
      note: "Numbers are omitted on purpose. The hosted frontend does not execute the engine.",
      engine_version: "0.1.0",
    },
    data_quality: {
      synthetic: true,
      warnings: [OFFLINE],
    },
    dataset_versions: [
      { dataset_id: "binance-btcusdt-fixture", synthetic: true },
      { dataset_id: "kalshi-btc-move-fixture", synthetic: true },
    ],
  },
};

const markets = [
  { venue: "BINANCE", market_id: "BTCUSDT", ticker: "BTCUSDT", title: "BTCUSDT", source: "fixture", synthetic: true },
  { venue: "KALSHI", market_id: "BTC-MOVE-FIXTURE", ticker: "BTC-MOVE-FIXTURE", title: "BTC move fixture", source: "catalog", synthetic: true },
  { venue: "POLYMARKET", market_id: "POLY-BTC-FIXTURE", question: "Polymarket BTC fixture", source: "catalog", synthetic: true },
];

const datasets = [
  { dataset_id: "binance-btcusdt-fixture", venue: "BINANCE", instrument: "BTCUSDT", period: "fixture", rows: "synthetic", quality: "ok", synthetic: true },
  { dataset_id: "kalshi-btc-move-fixture", venue: "KALSHI", instrument: "BTC-MOVE-FIXTURE", period: "fixture", rows: "synthetic", quality: "ok", synthetic: true },
  { dataset_id: "polymarket-btc-fixture", venue: "POLYMARKET", instrument: "POLY-BTC-FIXTURE", period: "fixture", rows: "synthetic", quality: "ok", synthetic: true },
];

export function hostedResponse(method: string, path: string, hypothesis?: string) {
  const clean = path.split("?")[0];
  if (clean === "/health") {
    return {
      ok: true,
      engine_version: "0.1.0",
      grok: false,
      model: null,
      mode: "ui-only",
      note: OFFLINE,
    };
  }
  if (clean === "/markets") return { markets };
  if (clean === "/datasets") return { datasets };
  if (clean === "/runs") return { runs: [sampleRun] };
  if (clean === `/runs/${SAMPLE_ID}`) return sampleRun;
  if (method === "POST" && clean === "/research") {
    return {
      ...sampleRun,
      id: "engine-offline",
      hypothesis: hypothesis || sampleRun.hypothesis,
      status: "BLOCKED",
      stage: "backtest",
      stages: stages.map((s) =>
        s.key === "backtest" || s.key === "analyze" ? { ...s, status: "blocked" } : s
      ),
      error: OFFLINE,
      ai_analysis: OFFLINE,
      results: {
        hosted_preview: true,
        analytics: null,
        equity: [],
        trades: [],
        assumptions: {},
        data_quality: { synthetic: true, warnings: [OFFLINE] },
      },
    };
  }
  return { error: `No hosted handler for ${method} ${clean}`, note: OFFLINE };
}
