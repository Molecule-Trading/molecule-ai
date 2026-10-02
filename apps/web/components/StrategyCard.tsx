"use client";

import Link from "next/link";
import type { Run } from "@/lib/api";
import { n, pct, shortDate, strategyTicker, strategyTitle } from "@/lib/format";

export function StrategyCard({
  run,
  inPortfolio = false,
  onDelete,
}: {
  run: Run;
  inPortfolio?: boolean;
  onDelete?: () => void;
}) {
  const a = run.results?.analytics;
  const ret = typeof a?.total_return === "number" ? a.total_return : undefined;
  const dd = typeof a?.max_drawdown === "number" ? a.max_drawdown : undefined;
  const backtested = run.status === "COMPLETED" && a;

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-ink-900">
      <Link href={`/runs/${run.id}`} className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">{strategyTicker(run)}</span>
          <span className="font-mono text-[10px] text-mute">{shortDate(run.started_at)}</span>
        </div>
        <h2 className="mt-2 text-base font-medium leading-snug">{strategyTitle(run)}</h2>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-mute">{run.hypothesis}</p>
        <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-line bg-line">
          <Stat label="Return" value={ret == null ? "—" : pct(ret)} tone={ret} />
          <Stat label="Sharpe" value={n(a?.sharpe)} tone={a?.sharpe} />
          <Stat label="Max DD" value={dd == null ? "—" : pct(dd)} down />
          <Stat label="Trades" value={String(a?.trade_count ?? "—")} />
        </div>
      </Link>
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
        <div className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
          {inPortfolio && <span>In portfolio</span>}
          {backtested && <span>Backtested</span>}
          {run.status === "FAILED" && <span>Failed</span>}
          {run.status === "BLOCKED" && <span>Blocked</span>}
        </div>
        {onDelete && (
          <button type="button" onClick={onDelete} className="text-xs text-mute hover:text-red-400">
            Delete
          </button>
        )}
      </div>
    </article>
  );
}

function Stat({ label, value, tone, down }: { label: string; value: string; tone?: number | null; down?: boolean }) {
  const color = down || (tone != null && tone < 0) ? "text-red-400" : tone != null && tone > 0 ? "text-emerald-400" : "text-text";
  return (
    <div className="bg-ink-950 px-2 py-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-mute">{label}</p>
      <p className={`mt-1 font-mono text-xs ${color}`}>{value}</p>
    </div>
  );
}
