/** Recorded engine sample for the hosted UI when FastAPI is not attached. */

import { fixture } from "./engine-fixture";
import { quote, type BookId } from "./sampleBook";

const OFFLINE =
  "This deployment is the research UI. A new hypothesis was not executed. Attach an API origin to run the engine. The recorded sample is engine output on synthetic data, not a live run.";

type AnyRec = Record<string, any>;

const recorded = fixture.run as AnyRec;
const markets = fixture.markets as AnyRec[];
const datasets = fixture.datasets as AnyRec[];

function sleeve(id: string, name: string, hypothesis: string, ticker: string, book: BookId) {
  const q = quote("MAX", 0.1, 0.05, book);
  const a = q.metrics;
  const spec = { ...(recorded.strategy_spec || {}), name, universe: { ...(recorded.strategy_spec?.universe || {}), target: { ticker, symbol: ticker } } };
  return {
    ...recorded,
    id,
    hypothesis,
    status: "COMPLETED",
    strategy_spec: spec,
    results: {
      ...(recorded.results || {}),
      analytics: {
        ...(recorded.results?.analytics || {}),
        total_return: a.total_return,
        cagr: a.cagr,
        sharpe: a.sharpe,
        sortino: a.sortino,
        calmar: a.calmar,
        max_drawdown: a.max_drawdown,
        trade_count: q.trades.length,
        win_rate: a.win_rate,
        net_pnl: a.net_pnl,
        gross_pnl: a.gross_pnl,
      },
    },
  };
}

const sleeves = [
  sleeve(String(recorded.id), String(recorded.strategy_spec?.name || "Falling vol momentum"), String(recorded.hypothesis), "BOOK", "momentum"),
  sleeve("sample-fade-vol", "Quiet pullback", "Buy the twenty-session pullback only while volatility sits under its own median.", "FADE", "fade"),
  sleeve("sample-trend-60", "Sixty session trend", "Stay long while the sixty-session return is positive.", "TREND", "trend"),
];

export const sampleRun = sleeves[0];

const BLOCKED_STAGES = (recorded.stages as AnyRec[]).map((s) => {
  if (s.key === "RUNNING_BACKTEST" || s.key === "CALCULATING_ANALYTICS" || s.key === "INTERPRETING") {
    return { ...s, status: "blocked" };
  }
  return { ...s, status: "done" };
});

function sameHypothesis(value: string | undefined) {
  if (!value) return false;
  return value.trim().toLowerCase() === String(fixture.hypothesis).trim().toLowerCase();
}

export function hostedResponse(method: string, path: string, hypothesis?: string) {
  const [clean, qs = ""] = path.split("?");
  const params = new URLSearchParams(qs);

  if (clean === "/health") {
    return {
      ok: true,
      engine_version: recorded.engine_version,
      grok: false,
      model: null,
      mode: "ui-only",
      recorded_run_id: recorded.id,
      note: "Hosted UI. New research is blocked until an API origin is configured. One recorded synthetic sample is available.",
    };
  }

  if (clean === "/markets") {
    const venue = (params.get("venue") || "").toUpperCase();
    const q = (params.get("q") || "").toLowerCase();
    const filtered = markets.filter((m) => {
      if (venue && String(m.venue).toUpperCase() !== venue) return false;
      if (!q) return true;
      const blob = `${m.symbol || ""} ${m.ticker || ""} ${m.market_id || ""} ${m.question || ""} ${m.title || ""}`.toLowerCase();
      return blob.includes(q);
    });
    return { markets: filtered };
  }

  if (clean === "/datasets") {
    const venue = (params.get("venue") || "").toUpperCase();
    const filtered = datasets.filter((d) => !venue || String(d.venue).toUpperCase() === venue);
    return { datasets: filtered };
  }

  if (clean === "/runs") return { runs: sleeves };
  const hit = sleeves.find((s) => clean === `/runs/${s.id}`);
  if (hit) return hit;

  if (method === "POST" && clean === "/research") {
    const text = hypothesis?.trim() || String(recorded.hypothesis);
    if (sameHypothesis(text)) {
      return {
        ...recorded,
        ai_analysis:
          "Opened the recorded synthetic sample for this hypothesis. The engine was not re-run on this request.",
      };
    }
    return {
      id: "engine-offline",
      hypothesis: text,
      status: "BLOCKED",
      stage: "RUNNING_BACKTEST",
      stages: BLOCKED_STAGES,
      started_at: new Date().toISOString(),
      completed_at: null,
      runtime: null,
      engine_version: recorded.engine_version,
      strategy_spec: null,
      ai_analysis: OFFLINE,
      error: OFFLINE,
      recorded_run_id: recorded.id,
      synthetic: true,
      results: {
        hosted_preview: true,
        analytics: null,
        equity: [],
        trades: [],
        assumptions: {
          note: "No P&L. This hypothesis was not run by the engine.",
        },
        data_quality: { synthetic: true, warnings: [OFFLINE] },
      },
    };
  }

  if (clean === "/runs/engine-offline") {
    return hostedResponse("POST", "/research", hypothesis);
  }

  return { error: `No hosted handler for ${method} ${clean}`, note: OFFLINE };
}
