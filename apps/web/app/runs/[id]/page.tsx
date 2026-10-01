"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, Run } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { DrawdownChart, EquityChart, MonteCarloChart } from "@/components/Charts";
import { deployPaper, isPaper, stopPaper } from "@/lib/desk";
import { strategyTicker, strategyTitle } from "@/lib/format";
import { ASSUMPTIONS, fanOf, splitOf, windowOf, type Span } from "@/lib/sampleBook";

const SPANS: Span[] = ["1Y", "3Y", "5Y", "MAX"];

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [paper, setPaper] = useState(false);
  const [span, setSpan] = useState<Span>("MAX");

  useEffect(() => {
    api<Run>(`/runs/${id}`)
      .then(setRun)
      .catch((e) => setErr(String(e)));
    setPaper(isPaper(id));
  }, [id]);

  const view = useMemo(() => windowOf(span), [span]);
  const split = useMemo(() => splitOf(view.bars), [view.bars]);
  const fan = useMemo(() => fanOf(view.bars), [view.bars]);

  function togglePaper() {
    if (!run) return;
    if (paper) {
      stopPaper(run.id);
      setPaper(false);
      return;
    }
    const a = view.metrics;
    deployPaper({
      runId: run.id,
      title: strategyTitle(run),
      ticker: strategyTicker(run),
      hypothesis: run.hypothesis,
      deployedAt: new Date().toISOString(),
      ret: a.total_return,
      sharpe: a.sharpe ?? undefined,
      pnl: a.net_pnl,
      trades: view.trades.length,
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

  const a = view.metrics;
  const from = view.bars[0]?.t;
  const to = view.bars[view.bars.length - 1]?.t;

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">{run.id}</div>
            <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight md:text-4xl">{strategyTitle(run)}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mute">{run.hypothesis}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/portfolio" className="rounded-full border border-line px-4 py-2 text-sm text-mute hover:text-text">
              Portfolio
            </Link>
            <button
              type="button"
              onClick={togglePaper}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                paper ? "border border-emerald-800 text-emerald-400" : "bg-text text-ink-950"
              }`}
            >
              {paper ? "Simulated · on" : "Deploy"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs text-mute">
            {from ? stamp(from) : "—"} – {to ? stamp(to) : "—"}
          </p>
          <div className="inline-flex rounded-full border border-line bg-ink-900 p-1">
            {SPANS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpan(s)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  span === s ? "bg-text text-ink-950" : "text-mute hover:text-text"
                }`}
              >
                {s === "MAX" ? "Max" : s.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
          <Stat label="Net P&L" value={money(a.net_pnl)} tone={toneOf(a.net_pnl)} />
          <Stat label="Return" value={pct2(a.total_return)} tone={toneOf(a.total_return)} />
          <Stat label="Sharpe" value={n2(a.sharpe)} tone={toneOf(a.sharpe)} />
          <Stat label="Sortino" value={n2(a.sortino)} tone={toneOf(a.sortino)} />
          <Stat label="Max DD" value={pct2(a.max_drawdown)} tone="down" />
          <Stat label="Win rate" value={pct2(a.win_rate)} />
          <Stat label="Trades" value={String(view.trades.length)} />
          <Stat label="End equity" value={money(a.ending_equity)} />
        </section>

        <section className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-2">
          <Split title="In sample" m={split.inn} />
          <Split title="Out of sample" m={split.out} />
        </section>

        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-mute">Assumptions</h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
            {ASSUMPTIONS.map(([k, v]) => (
              <div key={k}>
                <dt className="text-mute">{k}</dt>
                <dd className="mt-0.5 font-mono text-xs">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-6">
          <ChartCard title="Equity curve" note="Right axis · in-sample left of the marker">
            <EquityChart key={`eq-${span}`} data={view.bars} splitAt={split.at} />
          </ChartCard>
          <ChartCard title="Underwater" note="Drawdown from the running peak">
            <DrawdownChart key={`dd-${span}`} data={view.bars} />
          </ChartCard>
          <ChartCard title="Monte Carlo" note="48 resampled paths · band is the 10th to 90th percentile">
            <MonteCarloChart key={`mc-${span}`} data={fan} />
          </ChartCard>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">Trades</h2>
            <span className="font-mono text-xs text-mute">{view.trades.length}</span>
          </div>
          <div className="max-h-[440px] overflow-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-ink-900 font-mono text-mute">
                <tr>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Side</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {view.trades.map((t) => (
                  <tr key={t.trade_id} className="border-t border-line font-mono">
                    <td className="whitespace-nowrap px-3 py-2 text-mute">{stamp(t.fill_ts)}</td>
                    <td className={`px-3 py-2 ${t.side === "BUY" ? "text-emerald-400" : "text-red-400"}`}>{t.side}</td>
                    <td className="px-3 py-2">{t.quantity.toFixed(2)}</td>
                    <td className="px-3 py-2">{t.price.toFixed(2)}</td>
                    <td className="px-3 py-2 text-mute">{t.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function ChartCard({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-ink-900/40 p-4">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h3 className="text-sm">{title}</h3>
        <p className="text-[11px] text-mute">{note}</p>
      </div>
      {children}
    </div>
  );
}

function Split({ title, m }: { title: string; m: { total_return: number; sharpe: number | null; sortino: number | null; max_drawdown: number } }) {
  return (
    <div className="bg-ink-950 px-4 py-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">{title}</div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <Mini k="Return" v={pct2(m.total_return)} tone={toneOf(m.total_return)} />
        <Mini k="Sharpe" v={n2(m.sharpe)} tone={toneOf(m.sharpe)} />
        <Mini k="Sortino" v={n2(m.sortino)} tone={toneOf(m.sortino)} />
        <Mini k="Max DD" v={pct2(m.max_drawdown)} tone="down" />
      </div>
    </div>
  );
}

function Mini({ k, v, tone }: { k: string; v: string; tone?: "up" | "down" }) {
  const color = tone === "up" ? "text-emerald-400" : tone === "down" ? "text-red-400" : "text-text";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-mute">{k}</div>
      <div className={`mt-1 font-mono text-xs ${color}`}>{v}</div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const color = tone === "up" ? "text-emerald-400" : tone === "down" ? "text-red-400" : "text-text";
  return (
    <div className="bg-ink-950 px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-mute">{label}</div>
      <div className={`mt-1 font-mono text-sm ${color}`}>{value}</div>
    </div>
  );
}

function n2(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return Number(v).toFixed(2);
}
function money(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function pct2(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  const x = Number(v) * 100;
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(2)}%`;
}
function toneOf(v: number | null | undefined): "up" | "down" | undefined {
  if (v === null || v === undefined || Number.isNaN(Number(v)) || Number(v) === 0) return undefined;
  return Number(v) > 0 ? "up" : "down";
}
function stamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 19).replace("T", " ");
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
