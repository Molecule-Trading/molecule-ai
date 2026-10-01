"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, Run } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { DistChart, DrawdownChart, EquityChart, MonteCarloChart } from "@/components/Charts";
import { deployPaper, isPaper, stopPaper } from "@/lib/desk";
import { strategyTicker, strategyTitle } from "@/lib/format";
import { fanOf, histOf, monthsOf, quote, splitOf, type Span } from "@/lib/sampleBook";

const SPANS: Span[] = ["1Y", "3Y", "5Y", "MAX"];
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [paper, setPaper] = useState(false);
  const [span, setSpan] = useState<Span>("MAX");
  const [scale, setScale] = useState<"equity" | "pct" | "log">("equity");
  const [fee, setFee] = useState(0.1);
  const [slip, setSlip] = useState(0.05);
  const [cal, setCal] = useState(false);

  useEffect(() => {
    api<Run>(`/runs/${id}`).then(setRun).catch((e) => setErr(String(e)));
    setPaper(isPaper(id));
  }, [id]);

  const view = useMemo(() => quote(span, fee, slip), [span, fee, slip]);
  const split = useMemo(() => splitOf(view.bars), [view.bars]);
  const fan = useMemo(() => fanOf(view.bars), [view.bars]);
  const heat = useMemo(() => monthsOf(view.bars), [view.bars]);
  const dist = useMemo(() => histOf(view.rets), [view.rets]);
  const volDist = useMemo(() => histOf(view.vols), [view.vols]);
  const a = view.metrics;

  function togglePaper() {
    if (!run) return;
    if (paper) {
      stopPaper(run.id);
      setPaper(false);
      return;
    }
    deployPaper({
      runId: run.id,
      title: strategyTitle(run),
      ticker: strategyTicker(run),
      hypothesis: run.hypothesis,
      deployedAt: new Date().toISOString(),
      ret: a.cagr,
      sharpe: a.sharpe ?? undefined,
      pnl: a.net_pnl,
      trades: view.trades.length,
    });
    setPaper(true);
  }

  if (err) return <PageShell><div className="text-sm text-red-400">{err}</div></PageShell>;
  if (!run) return <PageShell><div className="text-sm text-mute">Loading strategy…</div></PageShell>;

  return (
    <PageShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/runs" className="text-sm text-mute transition-colors hover:text-text">← Strategies</Link>
            <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight md:text-4xl">{strategyTitle(run)}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mute">{run.hypothesis}</p>
          </div>
          <button type="button" onClick={togglePaper} className={`rounded-full px-4 py-2 text-sm font-medium ${paper ? "border border-emerald-800 text-emerald-400" : "bg-text text-ink-950"}`}>
            {paper ? "Simulated · on" : "Deploy"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setCal((v) => !v)} className="rounded-full border border-line px-3 py-1.5 text-xs text-mute hover:text-text">
            {view.bars[0]?.t} — {view.bars[view.bars.length - 1]?.t}
          </button>
          <div className="inline-flex rounded-full border border-line bg-ink-900 p-1">
            {SPANS.map((s) => (
              <button key={s} type="button" onClick={() => setSpan(s)} className={`rounded-full px-3 py-1 text-xs ${span === s ? "bg-text text-ink-950" : "text-mute"}`}>{s === "MAX" ? "Max" : s.toLowerCase()}</button>
            ))}
          </div>
          <div className="inline-flex rounded-full border border-line bg-ink-900 p-1">
            {(["equity", "pct", "log"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setScale(s)} className={`rounded-full px-3 py-1 text-xs ${scale === s ? "bg-text text-ink-950" : "text-mute"}`}>{s === "pct" ? "%" : s === "log" ? "Log" : "Equity"}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-mute">Fees %
            <input type="number" step="0.01" value={fee} onChange={(e) => setFee(Number(e.target.value))} className="w-16 rounded-md border border-line bg-ink-950 px-2 py-1 font-mono text-text" />
          </label>
          <label className="flex items-center gap-2 text-xs text-mute">Slippage %
            <input type="number" step="0.01" value={slip} onChange={(e) => setSlip(Number(e.target.value))} className="w-16 rounded-md border border-line bg-ink-950 px-2 py-1 font-mono text-text" />
          </label>
        </div>
        {cal && <Calendar start={view.bars[0]?.t} end={view.bars[view.bars.length - 1]?.t} onPick={(s) => { setSpan(s); setCal(false); }} />}

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4 xl:grid-cols-6">
          <Stat label="CAGR" value={pct2(a.cagr)} tone={toneOf(a.cagr)} />
          <Stat label="Gross P&L" value={money(a.gross_pnl)} tone={toneOf(a.gross_pnl)} />
          <Stat label="Net P&L" value={money(a.net_pnl)} tone={toneOf(a.net_pnl)} />
          <Stat label="Starting equity" value={money(a.starting_equity)} />
          <Stat label="Final equity" value={money(a.ending_equity)} />
          <Stat label="Sharpe" value={n2(a.sharpe)} tone={toneOf(a.sharpe)} />
          <Stat label="Sortino" value={n2(a.sortino)} tone={toneOf(a.sortino)} />
          <Stat label="Calmar" value={n2(a.calmar)} tone={toneOf(a.calmar)} />
          <Stat label="Max drawdown" value={pct2(a.max_drawdown)} tone="down" />
          <Stat label="Longest drawdown" value={`${a.max_dd_days}d`} />
          <Stat label="Max gain" value={pct2(a.max_gain)} tone="up" />
          <Stat label="Max loss" value={pct2(a.max_loss)} tone="down" />
        </section>

        <section className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-2">
          <Split title="In sample" m={split.inn} />
          <Split title="Out of sample" m={split.out} />
        </section>

        <ChartCard title="Equity curve" note="Green if the book finishes up. Grey is the benchmark. Red marker is the sample split.">
          <EquityChart key={`${span}-${scale}-${fee}-${slip}`} data={view.bars} splitAt={split.at} scale={scale} height={340} />
        </ChartCard>
        <ChartCard title="Underwater Drawdown Plot" note="Days under the running peak">
          <DrawdownChart key={`dd-${span}-${fee}`} data={view.bars} height={220} />
        </ChartCard>
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Monte Carlo" note="48 paths. Dashed lines are the 10th and 90th. Solid is the median.">
            <MonteCarloChart key={`mc-${span}-${fee}`} data={fan} height={280} />
          </ChartCard>
          <ChartCard title="Return distribution" note="Daily book returns">
            <DistChart data={dist} label="Days" height={280} />
          </ChartCard>
        </div>
        <ChartCard title="Volatility distribution" note="20-session realized volatility">
          <DistChart data={volDist} label="Sessions" height={220} />
        </ChartCard>

        <section className="overflow-x-auto rounded-xl border border-line">
          <div className="min-w-[720px] p-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">Return by month</h2>
            <div className="mt-3 grid grid-cols-[64px_repeat(12,1fr)] gap-1 text-[10px] text-mute">
              <span />
              {MONTHS.map((m) => <span key={m} className="text-center">{m}</span>)}
              {heat.years.map((y) => (
                <div key={y} className="contents">
                  <span className="font-mono">{y}</span>
                  {MONTHS.map((_, i) => {
                    const v = heat.cell(y, i + 1);
                    return <span key={i} title={v == null ? "" : pct2(v)} className="h-6 rounded-sm" style={{ background: heatColor(v) }} />;
                  })}
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {heat.yearStats.map((y) => (
                <div key={y.year} className="rounded-lg border border-line px-3 py-2 text-xs">
                  <div className="font-mono text-mute">{y.year}</div>
                  <div className="mt-1">DD {pct2(y.dd)} · Sharpe {n2(y.sharpe)} · {y.days}d in drawdown</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">Trade book</h2>
            <span className="font-mono text-xs text-mute">{view.trades.length} fills</span>
          </div>
          <div className="max-h-[480px] overflow-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-ink-900 font-mono text-mute">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Side</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Fill price</th>
                  <th className="px-3 py-2">Notional</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {view.trades.map((t) => (
                  <tr key={t.trade_id} className="border-t border-line font-mono">
                    <td className="px-3 py-2 text-mute">{t.fill_ts}</td>
                    <td className={`px-3 py-2 ${t.side === "BUY" ? "text-emerald-400" : "text-red-400"}`}>{t.side}</td>
                    <td className="px-3 py-2">{t.quantity}</td>
                    <td className="px-3 py-2">{t.price.toFixed(2)}</td>
                    <td className="px-3 py-2">{Math.round(t.quantity * t.price).toLocaleString()}</td>
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

function Calendar({ start, end, onPick }: { start?: string; end?: string; onPick: (s: Span) => void }) {
  return (
    <div className="max-w-md rounded-xl border border-line bg-ink-900 p-4">
      <p className="text-sm">{start} to {end}</p>
      <p className="mt-1 text-xs text-mute">Window is the recorded sample. Pick a span.</p>
      <div className="mt-3 flex gap-2">
        {SPANS.map((s) => (
          <button key={s} type="button" onClick={() => onPick(s)} className="rounded-full border border-line px-3 py-1 text-xs text-mute hover:text-text">{s === "MAX" ? "Max" : s.toLowerCase()}</button>
        ))}
      </div>
    </div>
  );
}

function heatColor(v?: number) {
  if (v == null) return "#1a1d22";
  const x = Math.max(-0.08, Math.min(0.08, v));
  return x >= 0 ? `rgba(52,211,153,${0.18 + x * 8})` : `rgba(248,113,113,${0.18 + Math.abs(x) * 8})`;
}

function ChartCard({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-ink-900/40 p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm">{title}</h3>
        <p className="text-[11px] text-mute">{note}</p>
      </div>
      {children}
    </div>
  );
}

function Split({ title, m }: { title: string; m: { cagr: number; sharpe: number | null; sortino: number | null; max_drawdown: number } }) {
  return (
    <div className="bg-ink-950 px-4 py-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">{title}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini k="CAGR" v={pct2(m.cagr)} tone={toneOf(m.cagr)} />
        <Mini k="Sharpe" v={n2(m.sharpe)} tone={toneOf(m.sharpe)} />
        <Mini k="Sortino" v={n2(m.sortino)} tone={toneOf(m.sortino)} />
        <Mini k="Max DD" v={pct2(m.max_drawdown)} tone="down" />
      </div>
    </div>
  );
}

function Mini({ k, v, tone }: { k: string; v: string; tone?: "up" | "down" }) {
  const color = tone === "up" ? "text-emerald-400" : tone === "down" ? "text-red-400" : "text-text";
  return <div><div className="text-[10px] uppercase tracking-wide text-mute">{k}</div><div className={`mt-1 font-mono text-xs ${color}`}>{v}</div></div>;
}
function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const color = tone === "up" ? "text-emerald-400" : tone === "down" ? "text-red-400" : "text-text";
  return <div className="bg-ink-950 px-3 py-3"><div className="text-[11px] uppercase tracking-wide text-mute">{label}</div><div className={`mt-1 font-mono text-sm ${color}`}>{value}</div></div>;
}
function n2(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toFixed(2);
}
function money(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  return `${n > 0 ? "+" : ""}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function pct2(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  const x = Number(v) * 100;
  return `${x > 0 ? "+" : ""}${x.toFixed(2)}%`;
}
function toneOf(v: number | null | undefined): "up" | "down" | undefined {
  if (v == null || Number(v) === 0) return undefined;
  return Number(v) > 0 ? "up" : "down";
}
