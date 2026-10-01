"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { loadPaper, stopPaper, type PaperPosition } from "@/lib/desk";
import { n, pct, shortDate } from "@/lib/format";

export default function PortfolioPage() {
  const [book, setBook] = useState<PaperPosition[]>([]);

  useEffect(() => {
    setBook(loadPaper());
  }, []);

  const totals = useMemo(() => {
    const withRet = book.filter((p) => typeof p.ret === "number");
    const ret = withRet.reduce((s, p) => s + (p.ret || 0), 0);
    const pnl = book.reduce((s, p) => s + (p.pnl || 0), 0);
    return { ret, pnl, n: book.length };
  }, [book]);

  function remove(runId: string) {
    setBook(stopPaper(runId));
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">Portfolio</div>
          <h1 className="mt-1 font-serif text-4xl font-medium tracking-tight">Paper book</h1>
          <p className="mt-2 text-sm text-mute">{totals.n} deployed</p>
        </div>
        <Link href="/runs" className="rounded-full border border-line px-4 py-2 text-sm text-mute hover:text-text">
          Strategies
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-px bg-line md:grid-cols-3">
        <Stat label="Positions" value={String(totals.n)} />
        <Stat label="Sum of backtest returns" value={book.length ? pct(totals.ret) : "—"} />
        <Stat label="Sum of recorded P&L" value={book.length ? n(totals.pnl) : "—"} />
      </div>
      <p className="mt-3 text-xs text-mute">
        Paper only. Figures are the strategy’s recorded backtest, not a live mark.
      </p>

      {book.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="text-sm text-mute">Nothing deployed to paper yet.</p>
          <Link href="/runs" className="mt-4 inline-block text-sm text-text underline">
            Open a strategy and deploy it
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {book.map((p) => (
            <article key={p.runId} className="rounded-2xl border border-line bg-ink-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] tracking-wider">
                  {p.ticker}
                </span>
                <span className="rounded-full border border-emerald-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-400">
                  Paper
                </span>
              </div>
              <h2 className="mt-4 text-lg font-medium leading-snug">{p.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-mute">{p.hypothesis}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3 font-mono text-xs">
                <span className={typeof p.ret === "number" && p.ret < 0 ? "text-red-400" : "text-text"}>
                  {pct(p.ret)}
                </span>
                <span className="text-mute">SR {n(p.sharpe)}</span>
                <span className="text-mute">{p.trades ?? 0} trades</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-mute">Since {shortDate(p.deployedAt)}</span>
                <div className="flex items-center gap-3">
                  <Link href={`/runs/${p.runId}`} className="text-text underline">
                    Open
                  </Link>
                  <button type="button" onClick={() => remove(p.runId)} className="text-mute hover:text-text">
                    Stop
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
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
