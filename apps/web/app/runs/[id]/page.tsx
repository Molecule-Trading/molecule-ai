"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, Run } from "@/lib/api";
import { Stages } from "@/components/Stages";
import { DrawdownChart, EquityChart } from "@/components/Charts";

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Run>(`/runs/${id}`)
      .then(setRun)
      .catch((e) => setErr(String(e)));
  }, [id]);

  if (err) return <div className="text-sm text-red-400">{err}</div>;
  if (!run) return <div className="text-sm text-mute">Loading run…</div>;

  const a = run.results?.analytics;
  const equity = run.results?.equity || [];
  const trades = run.results?.trades || [];
  const assumptions = run.results?.assumptions || {};
  const quality = run.results?.data_quality;

  return (
    <div className="space-y-10">
      <div>
        <div className="font-mono text-xs text-mute">{run.id}</div>
        <h1 className="mt-1 text-xl font-medium">{run.hypothesis}</h1>
        <div className="mt-2 font-mono text-xs text-mute">
          {run.status} · engine {run.engine_version || "—"} · {run.data_period || "—"}
        </div>
      </div>

      <section className="grid gap-8 md:grid-cols-[220px_1fr]">
        <Stages stages={run.stages} />
        {run.error && <div className="text-sm text-red-400">{run.error}</div>}
      </section>

      {a && (
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-mute">
            Backtest results
          </h2>
          <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-6">
            <Stat label="Net P&L" value={n(a.net_pnl)} />
            <Stat label="Return" value={pct(a.total_return)} />
            <Stat label="Sharpe" value={n(a.sharpe)} />
            <Stat label="Max DD" value={pct(a.max_drawdown)} />
            <Stat label="Trades" value={String(a.trade_count)} />
            <Stat label="Win rate" value={pct(a.win_rate)} />
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

      <section className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-mute">Strategy</h2>
          <pre className="overflow-auto border border-line bg-ink-900 p-3 text-xs">
            {JSON.stringify(run.strategy_spec || run.results?.strategy, null, 2)}
          </pre>
        </div>
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-mute">Assumptions</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(assumptions).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-mute">{k}</dt>
                  <dd className="font-mono">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-mute">Data quality</h2>
            <pre className="overflow-auto border border-line bg-ink-900 p-3 text-xs">
              {JSON.stringify(quality, null, 2)}
            </pre>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-mute">Grok analysis</h2>
        <div className="border border-line bg-ink-900 p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {run.ai_analysis || "No model interpretation. Deterministic results only."}
        </div>
      </section>
    </div>
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
