"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, type Run } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { DrawdownChart, EquityChart } from "@/components/Charts";
import { n, pct, strategyTicker, strategyTitle } from "@/lib/format";
import { portfolioOf } from "@/lib/sampleBook";

export default function PortfolioPage() {
  const book = useMemo(() => portfolioOf(), []);
  const [runs, setRuns] = useState<Run[]>([]);
  const a = book.metrics;

  useEffect(() => {
    api<{ runs: Run[] }>("/runs")
      .then((r) => setRuns(r.runs))
      .catch(() => setRuns([]));
  }, []);

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">Portfolio</div>
          <h1 className="mt-1 font-serif text-4xl font-medium tracking-tight">All strategies, one book</h1>
          <p className="mt-2 max-w-xl text-sm text-mute">Equal weight across the three simulated books. The figures below are the combined path, not a sum of the sleeves.</p>
        </div>
        <Link href="/runs" className="rounded-full border border-line px-4 py-2 text-sm text-mute hover:text-text">
          Strategies
        </Link>
      </div>

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

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {(runs.length ? runs : []).map((run) => (
          <Link key={run.id} href={`/runs/${run.id}`} className="rounded-2xl border border-line bg-ink-900 p-4 hover:border-text">
            <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] tracking-wider">{strategyTicker(run)}</span>
            <h2 className="mt-4 text-lg font-medium leading-snug">{strategyTitle(run)}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-mute">{run.hypothesis}</p>
            <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-3 font-mono text-xs">
              <span>{pct(run.results?.analytics?.cagr ?? run.results?.analytics?.total_return)}</span>
              <span className="text-mute">SR {n(run.results?.analytics?.sharpe)}</span>
              <span className="text-mute">{run.results?.analytics?.trade_count ?? 0} trades</span>
            </div>
          </Link>
        ))}
      </div>
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