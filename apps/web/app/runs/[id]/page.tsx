"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, Run } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { DistChart, DrawdownChart, EquityChart, MonteCarloChart } from "@/components/Charts";
import { addToBook, hideStrategy, inBook } from "@/lib/desk";
import { strategyTicker, strategyTitle } from "@/lib/format";
import { bookIdOf, clip, fanOf, histOf, quote, splitOf, yearRows, type Span } from "@/lib/sampleBook";

const SPANS: Span[] = ["1Y", "3Y", "5Y", "MAX"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const [span, setSpan] = useState<Span>("MAX");
  const [scale, setScale] = useState<"equity" | "pct" | "log">("equity");
  const [fee, setFee] = useState(0.1);
  const [slip, setSlip] = useState(0.05);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [cal, setCal] = useState(false);

  useEffect(() => {
    api<Run>(`/runs/${id}`).then(setRun).catch((e) => setErr(String(e)));
    setHeld(inBook(id));
  }, [id]);

  const book = bookIdOf(id);
  const full = useMemo(() => quote("MAX", fee, slip, book), [fee, slip, book]);
  const view = useMemo(() => clip(full.bars, full.trades, full.closed, from, to), [full, from, to]);
  const split = useMemo(() => splitOf(view.bars, book), [view.bars, book]);
  const fan = useMemo(() => fanOf(view.bars), [view.bars]);
  const years = useMemo(() => yearRows(view.bars), [view.bars]);
  const dist = useMemo(() => histOf(view.rets), [view.rets]);
  const volDist = useMemo(() => histOf(view.vols), [view.vols]);
  const a = view.metrics;
  const script = run ? strategyTitle(run) : "Book";

  function add() {
    if (!run || held) return;
    addToBook({
      runId: run.id,
      title: strategyTitle(run),
      ticker: strategyTicker(run),
      hypothesis: run.hypothesis,
    });
    setHeld(true);
  }

  function removeStrategy() {
    if (!run) return;
    hideStrategy(run.id);
    router.push("/runs");
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
          <div className="flex items-center gap-2">
            <button type="button" onClick={removeStrategy} className="rounded-full border border-line px-4 py-2 text-sm text-red-400">
              Delete
            </button>
            <button type="button" onClick={add} disabled={held} className={`rounded-full px-4 py-2 text-sm font-medium ${held ? "border border-line text-mute" : "bg-text text-ink-950"}`}>
              {held ? "In portfolio" : "Add to portfolio"}
            </button>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setCal((v) => !v)} className="rounded-full border border-line px-3 py-1.5 text-xs text-mute hover:text-text">
            {(from || full.bars[0]?.t)} — {(to || full.bars[full.bars.length - 1]?.t)}
          </button>
          {cal && (
            <RangePopover
              min={full.bars[0]?.t || ""}
              max={full.bars[full.bars.length - 1]?.t || ""}
              from={from || full.bars[0]?.t || ""}
              to={to || full.bars[full.bars.length - 1]?.t || ""}
              onChange={(a, b) => {
                setFrom(a);
                setTo(b);
                setSpan("MAX");
              }}
              onClose={() => setCal(false)}
            />
          )}
          <div className="inline-flex rounded-full border border-line bg-ink-900 p-1">
            {SPANS.map((s) => (
              <button key={s} type="button" onClick={() => { setSpan(s); const bars = full.bars; if (s === "MAX") { setFrom(null); setTo(null); return; } const n = s === "1Y" ? 252 : s === "3Y" ? 756 : 1260; const slice = bars.slice(-n); setFrom(slice[0]?.t || null); setTo(slice[slice.length - 1]?.t || null); }} className={`rounded-full px-3 py-1 text-xs ${span === s && !from ? "bg-text text-ink-950" : span === s ? "bg-text text-ink-950" : "text-mute"}`}>{s === "MAX" ? "Max" : s.toLowerCase()}</button>
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

        <section className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
          <Split title="In sample" m={split.inn} />
          <Split title="Out of sample" m={split.out} />
        </section>

        <ChartCard title="Equity curve" note="Green if the book finishes up. Grey is the benchmark. Red marker is the sample split.">
          <EquityChart key={`${span}-${scale}-${fee}-${slip}`} data={view.bars} splitAt={split.at} scale={scale} height={340} />
        </ChartCard>
        <ChartCard title="Underwater Drawdown Plot" note="Days under the running peak">
          <DrawdownChart key={`dd-${span}-${fee}`} data={view.bars} height={220} />
        </ChartCard>
        <div className="grid gap-4 xl:grid-cols-3">
          <ChartCard title="Monte Carlo" note="48 paths. 10th, median, 90th.">
            <MonteCarloChart key={`mc-${from}-${to}-${fee}-${book}`} data={fan} height={240} />
          </ChartCard>
          <ChartCard title="Return distribution" note="Daily book returns">
            <DistChart key={`rd-${from}-${to}-${book}`} data={dist} label="Days" height={240} />
          </ChartCard>
          <ChartCard title="Volatility distribution" note="20-session realized volatility">
            <DistChart key={`vd-${from}-${to}-${book}`} data={volDist} label="Sessions" height={240} />
          </ChartCard>
        </div>

        <section className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[980px] text-right text-xs">
            <thead className="font-mono text-[10px] uppercase tracking-wide text-mute">
              <tr>
                <th className="px-3 py-2 text-left">Year</th>
                {MONTHS.map((m) => <th key={m} className="px-2 py-2 font-medium">{m}</th>)}
                <th className="px-2 py-2">Total</th>
                <th className="px-2 py-2">Max drawdown</th>
                <th className="px-2 py-2 text-left">Days for MDD</th>
                <th className="px-3 py-2">R / MDD</th>
              </tr>
            </thead>
            <tbody>
              {years.map((row) => (
                <tr key={row.year} className="border-t border-line font-mono">
                  <td className="px-3 py-2 text-left text-mute">{row.year}</td>
                  {row.months.map((v, i) => (
                    <td key={i} className={`px-2 py-2 ${v == null || v === 0 ? "text-mute" : v > 0 ? "text-emerald-400" : "text-red-400"}`}>{v == null ? "—" : signed(v)}</td>
                  ))}
                  <td className={`px-2 py-2 ${row.total >= 0 ? "text-emerald-400" : "text-red-400"}`}>{signed(row.total)}</td>
                  <td className="px-2 py-2 text-red-400">{signed(row.maxDd)}</td>
                  <td className="px-2 py-2 text-left text-mute">{row.ddDays}d · {row.ddFrom.slice(5)} to {row.ddTo.slice(5)}</td>
                  <td className={`px-3 py-2 ${row.ratio != null && row.ratio < 0 ? "text-red-400" : "text-text"}`}>{row.ratio == null ? "—" : row.ratio.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  <th className="px-3 py-2">Script</th>
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
                    <td className="px-3 py-2 text-mute">{script}</td>
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

function RangePopover({
  min,
  max,
  from,
  to,
  onChange,
  onClose,
}: {
  min: string;
  max: string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  onClose: () => void;
}) {
  const [cursor, setCursor] = useState(from.slice(0, 7));
  const [anchor, setAnchor] = useState<string | null>(null);
  const [y, m] = cursor.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const startPad = first.getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [...Array(startPad).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  function pick(day: number) {
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (iso < min || iso > max) return;
    if (!anchor) {
      setAnchor(iso);
      return;
    }
    const a = anchor < iso ? anchor : iso;
    const b = anchor < iso ? iso : anchor;
    onChange(a, b);
    setAnchor(null);
    onClose();
  }

  function shift(dir: number) {
    const d = new Date(Date.UTC(y, m - 1 + dir, 1));
    setCursor(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  const y0 = Number(min.slice(0, 4));
  const y1 = Number(max.slice(0, 4));
  const years = Array.from({ length: Math.max(0, y1 - y0 + 1) }, (_, i) => y0 + i);

  return (
    <div className="absolute left-0 top-10 z-30 w-[320px] rounded-xl border border-line bg-ink-950 p-3 shadow-2xl">
      <div className="flex flex-wrap gap-1">
        {years.map((yr) => (
          <button key={yr} type="button" onClick={() => setCursor(`${yr}-${String(m).padStart(2, "0")}`)} className={`rounded-full px-2 py-0.5 text-[11px] ${yr === y ? "bg-text text-ink-950" : "text-mute hover:text-text"}`}>
            {yr}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <button type="button" onClick={() => shift(-1)} className="px-2 text-mute hover:text-text">‹</button>
        <span>{first.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</span>
        <button type="button" onClick={() => shift(1)} className="px-2 text-mute hover:text-text">›</button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] text-mute">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const iso = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const off = iso < min || iso > max;
          const on = iso >= from && iso <= to;
          return (
            <button key={iso} type="button" disabled={off} onClick={() => pick(day)} className={`h-7 rounded-md ${off ? "text-line" : on ? "bg-text text-ink-950" : "hover:bg-ink-800"}`}>
              {day}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-mute">Select a start date, then an end date.</p>
    </div>
  );
}

function signed(v: number) {
  const n = Math.round(v);
  return `${n > 0 ? "" : ""}${n.toLocaleString("en-US")}`;
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
