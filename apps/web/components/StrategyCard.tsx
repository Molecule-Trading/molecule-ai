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
  const weak = typeof ret === "number" ? ret < 0 : false;
  const backtested = run.status === "COMPLETED" && a;

  return (
    <article className="rounded-2xl border border-line bg-ink-900 p-4">
      <Link href={`/runs/${run.id}`} className="block text-left">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] tracking-wider">
            {strategyTicker(run)}
          </span>
          <div className="flex gap-2 text-[10px] uppercase tracking-wider">
            {inPortfolio && (
              <span className="rounded-full border border-line px-2 py-0.5 text-mute">In portfolio</span>
            )}
            {backtested && (
              <span className="rounded-full border border-line px-2 py-0.5 text-mute">Backtested</span>
            )}
            {run.status === "BLOCKED" && (
              <span className="rounded-full border border-line px-2 py-0.5 text-mute">Blocked</span>
            )}
          </div>
        </div>
        <h2 className="mt-4 text-lg font-medium leading-snug">{strategyTitle(run)}</h2>
        <p className="mt-1 line-clamp-2 text-sm text-mute">{run.hypothesis}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3 font-mono text-xs">
          {a ? (
            <>
              <span className={weak ? "text-red-400" : "text-emerald-400"}>{weak ? "Weak" : "Firm"}</span>
              <span className={weak ? "text-red-400" : "text-text"}>{pct(ret)}</span>
              <span className="text-mute">SR {n(a.sharpe)}</span>
              <span className="text-mute">{a.trade_count ?? 0} trades</span>
            </>
          ) : (
            <span className="text-mute">No engine numbers on this record</span>
          )}
        </div>
      </Link>
      <div className="mt-3 flex items-center justify-between text-xs text-mute">
        <span>{run.status === "COMPLETED" ? "Evaluated" : run.status} · {shortDate(run.started_at)}</span>
        {onDelete && (
          <button type="button" onClick={onDelete} className="text-red-400 hover:text-red-300">
            Delete
          </button>
        )}
      </div>
    </article>
  );
}