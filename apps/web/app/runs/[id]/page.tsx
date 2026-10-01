"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, Run } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { DrawdownChart, EquityChart } from "@/components/Charts";
import { deployPaper, isPaper, stopPaper } from "@/lib/desk";
import { strategyTicker, strategyTitle } from "@/lib/format";

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [paper, setPaper] = useState(false);

  useEffect(() => {
    api<Run>(`/runs/${id}`)
      .then(setRun)
      .catch((e) => setErr(String(e)));
    setPaper(isPaper(id));
  }, [id]);

  function togglePaper() {
    if (!run) return;
    if (paper) {
      stopPaper(run.id);
      setPaper(false);
      return;
    }
    const a = run.results?.analytics;
    deployPaper({
      runId: run.id,
      title: strategyTitle(run),
      ticker: strategyTicker(run),
      hypothesis: run.hypothesis,
      deployedAt: new Date().toISOString(),
      ret: typeof a?.total_return === "number" ? a.total_return : undefined,
      sharpe: typeof a?.sharpe === "number" ? a.sharpe : undefined,
      pnl: typeof a?.net_pnl === "number" ? a.net_pnl : undefined,
      trades: typeof a?.trade_count === "number" ? a.trade_count : undefined,
    });
    setPaper(true);
  }

  if (err) {
    return (
      <PageShell>
        <div className="text-sm text-red-400">{err}</div>
      </PageShell>
    );
  }
  if (!run) {
    return (
      <PageShell>
        <div className="text-sm text-mute">Loading strategy…</div>
      </PageShell>
    );
  }

  const a = run.results?.analytics;
  const equity = run.results?.equity || [];
  const trades = run.results?.trades || [];
  const assumptions = run.results?.assumptions || {};

  return (
    <PageShell>
      <div className="space-y-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-xs text-mute">{run.id}</div>
            <h1 className="mt-1 font-serif text-3xl font-medium">{strategyTitle(run)}</h1>
            <p className="mt-2 max-w-3xl text-sm text-mute">{run.hypothesis}</p>
            <div className="mt-2 font-mono text-xs text-mute">
              {run.status} · engine {run.engine_version || "—"} · {run.data_period || "—"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/portfolio"
              className="rounded-full border border-line px-4 py-2 text-sm text-mute hover:text-text"
            >
              Portfolio
            </Link>
            <button
              type="button"
              onClick={togglePaper}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                paper ? "border border-emerald-800 text-emerald-400" : "bg-text text-ink-950"
              }`}
            >
              {paper ? "Paper · deployed" : "Deploy to paper"}
            </button>
          </div>
        </div>

        {run.error && <div className="text-sm text-red-400">{run.error}</div>}

        {a && (
          <section>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-mute">Backtest results</h2>
            <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
              <Stat label="Net P&L" value={n(a.net_pnl)} />
              <Stat label="Return" value={pct(a.total_return)} />
              <Stat label="Sharpe" value={n(a.sharpe)} />
              <Stat label="Sortino" value={n(a.sortino)} />
              <Stat label="Max DD" value={pct(a.max_drawdown)} />
              <Stat label="Win rate" value={pct(a.win_rate)} />
              <Stat label="Trades" value={String(a.trade_count)} />
              <Stat label="End equity" value={n(a.ending_equity)} />
            </div>
          </section>
        )}

        {equity.length > 0 && (
          <section className="grid gap-8 md:grid-cols-2">
            <div className="border border-line p-3">
              <h3 className="mb-2 text-sm">Equity</h3>
              <EquityChart data={equity} />
            </div>
            <div className="border border-line p-3">
              <h3 className="mb-2 text-sm">Drawdown</h3>
              <DrawdownChart data={equity} />
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-mute">Trades</h2>
          <div className="overflow-x-auto border border-line">
            <table className="w-full text-left text-xs">
              <thead className="bg-ink-900 font-mono text-mute">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Side</th>
                  <th className="px-3 py-2">Outcome</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Fill</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-mute" colSpan={7}>
                      No fills on this record.
                    </td>
                  </tr>
                )}
                {trades.map((t: any) => (
                  <tr key={t.trade_id} className="border-t border-line font-mono">
                    <td className="px-3 py-2">{t.trade_id}</td>
                    <td className="px-3 py-2">{t.reason}</td>
                    <td className="px-3 py-2">{t.side}</td>
                    <td className="px-3 py-2">{t.outcome}</td>
                    <td className="px-3 py-2">{Number(t.quantity).toFixed(2)}</td>
                    <td className="px-3 py-2">{Number(t.price).toFixed(4)}</td>
                    <td className="px-3 py-2">{String(t.fill_ts).slice(0, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {Object.entries(assumptions).some(([, v]) => v === null || ["string", "number", "boolean"].includes(typeof v)) && (
          <section>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-mute">Assumptions</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(assumptions)
                .filter(([, v]) => v === null || ["string", "number", "boolean"].includes(typeof v))
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-mute">{k.replaceAll("_", " ")}</dt>
                    <dd className="font-mono">{String(v)}</dd>
                  </div>
                ))}
            </dl>
          </section>
        )}
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-900 px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-mute">{label}</div>
      <div className="mt-1 font-mono text-sm">{value}</div>
    </div>
  );
}

function n(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(4);
}
function pct(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `${(Number(v) * 100).toFixed(2)}%`;
}
