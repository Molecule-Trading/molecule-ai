"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { DrawdownChart, EquityChart } from "@/components/Charts";
import { n, pct } from "@/lib/format";
import { loadBook, loadDeskRun, removeFromBook, setWeight, type Sleeve } from "@/lib/desk";
import { replay } from "@/lib/desk/engine";
import { bookIdOf, metricsOf, portfolioWeighted, quote, type Bar } from "@/lib/sampleBook";

function blendDated(parts: { weight: number; bars: { t: string; equity: number }[] }[]) {
  const live = parts.filter((p) => p.weight > 0 && p.bars.length > 1);
  if (!live.length) return { bars: [] as Bar[], metrics: null };
  const sum = live.reduce((s, p) => s + p.weight, 0);
  const dates = [...new Set(live.flatMap((p) => p.bars.map((b) => b.t)))].sort();
  const maps = live.map((p) => new Map(p.bars.map((b) => [b.t, b.equity])));
  const last = live.map((p) => p.bars[0].equity);
  let equity = 100000;
  let peak = equity;
  const bars: Bar[] = [];
  for (const t of dates) {
    let r = 0;
    live.forEach((p, k) => {
      const mark = maps[k].get(t);
      if (mark == null || !last[k]) return;
      r += (p.weight / sum) * (mark / last[k] - 1);
      last[k] = mark;
    });
    equity *= 1 + r;
    peak = Math.max(peak, equity);
    bars.push({ t, equity, drawdown: peak ? equity / peak - 1 : 0 });
  }
  return { bars, metrics: metricsOf(bars.map((b) => b.equity), []) };
}

export default function PortfolioPage() {
  const [sleeves, setSleeves] = useState<Sleeve[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    setSleeves(loadBook());
  }, []);

  const book = useMemo(() => {
    const parts = sleeves.map((s) => {
      const tape = loadDeskRun(s.runId)?.results?.tape;
      if (Array.isArray(tape) && tape.length) return { weight: s.weight, bars: replay(tape, 0.1, 0.05).bars, live: true };
      return { weight: s.weight, bars: quote("MAX", 0.1, 0.05, bookIdOf(s.runId)).bars, live: false };
    });
    if (!parts.some((p) => p.live)) return portfolioWeighted(sleeves.map((s) => ({ book: bookIdOf(s.runId), weight: s.weight })));
    return blendDated(parts);
  }, [sleeves]);
  const a = book.metrics;
  const total = sleeves.reduce((s, x) => s + (Number(x.weight) || 0), 0) || 1;

  function drop(runId: string) {
    setSleeves(removeFromBook(runId));
  }

  function weight(runId: string, value: number) {
    setSleeves(setWeight(runId, value));
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">Portfolio</div>
          <h1 className="mt-1 font-serif text-4xl font-medium tracking-tight">Weighted book</h1>
          <p className="mt-2 max-w-xl text-sm text-mute">Simulate strategies on portfolio level</p>
        </div>
        <Link href="/runs" className="rounded-full border border-line px-4 py-2 text-sm text-mute hover:text-text">
          Strategies
        </Link>
      </div>

      {sleeves.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="text-sm text-mute">Nothing in the portfolio yet.</p>
          <Link href="/runs" className="mt-4 inline-block text-sm text-text underline">
            Open a strategy and add it
          </Link>
        </div>
      ) : (
        <>
          {a ? (
            <>
              <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4 xl:grid-cols-6">
                <Stat label="CAGR" value={pct(a.cagr)} tone={a.cagr} />
                <Stat label="Net P&L" value={money(a.net_pnl)} tone={a.net_pnl} />
                <Stat label="Starting equity" value={money(a.starting_equity, true)} />
                <Stat label="Final equity" value={money(a.ending_equity, true)} tone={a.ending_equity - a.starting_equity} />
                <Stat label="Sharpe" value={n(a.sharpe)} tone={a.sharpe} />
                <Stat label="Sortino" value={n(a.sortino)} tone={a.sortino} />
                <Stat label="Calmar" value={n(a.calmar)} tone={a.calmar} />
                <Stat label="Max drawdown" value={pct(a.max_drawdown)} down />
                <Stat label="Longest drawdown" value={`${a.max_dd_days}d`} />
                <Stat label="Volatility" value={a.volatility == null ? "—" : pct(a.volatility)} />
                <Stat label="Max gain" value={pct(a.max_gain)} tone={a.max_gain} />
                <Stat label="Max loss" value={pct(a.max_loss)} down />
              </section>
              <section className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-line p-4">
                  <h2 className="mb-2 text-sm">Portfolio equity</h2>
                  <EquityChart data={book.bars} height={280} />
                </div>
                <div className="rounded-xl border border-line p-4">
                  <h2 className="mb-2 text-sm">Underwater Drawdown Plot</h2>
                  <DrawdownChart data={book.bars} height={280} />
                </div>
              </section>
            </>
          ) : (
            <p className="mt-6 text-sm text-mute">Every weight is 0. Raise one to plot the book. The strategies stay here.</p>
          )}

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {sleeves.map((s) => (
              <article key={s.runId} className="rounded-2xl border border-line bg-ink-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] tracking-wider">{s.ticker}</span>
                  <button type="button" onClick={() => drop(s.runId)} className="text-xs text-red-400 hover:text-red-300">
                    Remove
                  </button>
                </div>
                <h2 className="mt-4 text-lg font-medium leading-snug">{s.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-mute">{s.hypothesis}</p>
                <label className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-mute">
                  Weight
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={draft[s.runId] ?? String(s.weight)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setDraft((d) => ({ ...d, [s.runId]: raw }));
                        if (raw.trim() === "") return;
                        const n = Number(raw);
                        if (Number.isFinite(n)) weight(s.runId, n);
                      }}
                      className="w-16 rounded-md border border-line bg-ink-950 px-2 py-1 text-right font-mono text-sm text-text outline-none"
                    />
                    <span className="font-mono text-text">{((s.weight / total) * 100).toFixed(1)}%</span>
                  </span>
                </label>
                <Link href={`/runs/${s.runId}`} className="mt-3 inline-block text-xs text-text underline">
                  Open strategy
                </Link>
              </article>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}

function Stat({ label, value, tone, down }: { label: string; value: string; tone?: number | null; down?: boolean }) {
  const color = down || (tone != null && tone < 0) ? "text-red-400" : tone != null && tone > 0 ? "text-emerald-400" : "text-text";
  return (
    <div className="bg-ink-950 px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{label}</div>
      <div className={`mt-1 font-mono text-sm ${color}`}>{value}</div>
    </div>
  );
}

function money(v: number, plain = false) {
  const n = Math.round(v).toLocaleString("en-US");
  if (plain) return n;
  return `${v > 0 ? "+" : ""}${n}`;
}