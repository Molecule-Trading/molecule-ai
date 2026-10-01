"use client";

import { useEffect, useState } from "react";
import { DrawdownChart, EquityChart } from "@/components/Charts";
import { windowOf } from "@/lib/sampleBook";

const USER = "Buy when the twenty-day return is positive and volatility is falling.";

const REPLY = [
  "Long only when both gates are on.",
  "Entry when the twenty-session return is above zero and realized volatility is below its own median.",
  "Exit when either gate fails. Costs stay on the path.",
];

const view = windowOf("MAX");
const m = view.metrics;

export function StrategyThread() {
  const [phase, setPhase] = useState(0);
  const done = phase > REPLY.length;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(REPLY.length + 1);
      return;
    }
    let timer = 0;
    const step = (p: number) => {
      setPhase(p);
      const hold = p > REPLY.length;
      const next = hold ? 0 : p + 1;
      timer = window.setTimeout(() => step(next), hold ? 8000 : 900);
    };
    timer = window.setTimeout(() => step(1), 400);
    return () => window.clearTimeout(timer);
  }, []);

  const lines = REPLY.slice(0, Math.max(0, phase - 1));

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/60">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <img src="/icon-32.png" alt="" className="h-5 w-5" />
          <p className="text-sm text-text">MoleculeAI</p>
        </div>
        <p className="font-mono text-[11px] text-mute">molecule 1.0</p>
      </div>
      <div className="flex min-h-[520px] flex-col gap-5 px-5 py-6 md:px-8" aria-live="polite">
        {phase >= 1 && (
          <div className="flex justify-end">
            <p className="thread-in max-w-xl rounded-2xl rounded-br-md bg-ink-800 px-4 py-3 text-sm leading-relaxed text-text">
              {USER}
            </p>
          </div>
        )}
        {lines.length > 0 && (
          <div className="flex gap-3">
            <img src="/icon-32.png" alt="" className="mt-0.5 h-7 w-7 shrink-0" />
            <div className="min-w-0 flex-1 space-y-3">
              {lines.map((line) => (
                <p key={line} className="thread-in max-w-2xl text-sm leading-relaxed text-text">
                  {line}
                </p>
              ))}
              {done && (
                <div className="thread-in space-y-4">
                  <div className="grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
                    <Metric k="Return" v={pct(m.total_return)} tone={m.total_return} />
                    <Metric k="Sharpe" v={num(m.sharpe)} tone={m.sharpe} />
                    <Metric k="Sortino" v={num(m.sortino)} tone={m.sortino} />
                    <Metric k="Max DD" v={pct(m.max_drawdown)} tone={m.max_drawdown} down />
                    <Metric k="Trades" v={String(view.trades.length)} />
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-line bg-ink-950/50 px-3 py-3">
                      <p className="mb-1 text-xs text-mute">Equity curve</p>
                      <EquityChart data={view.bars} height={210} />
                    </div>
                    <div className="rounded-xl border border-line bg-ink-950/50 px-3 py-3">
                      <p className="mb-1 text-xs text-mute">Underwater</p>
                      <DrawdownChart data={view.bars} height={210} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ k, v, tone, down }: { k: string; v: string; tone?: number | null; down?: boolean }) {
  const color = down || (tone != null && tone < 0) ? "text-red-400" : tone != null && tone > 0 ? "text-emerald-400" : "text-text";
  return (
    <div className="bg-ink-950 px-3 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{k}</p>
      <p className={`mt-1 font-mono text-sm ${color}`}>{v}</p>
    </div>
  );
}

function num(v: number | null) {
  return v == null ? "—" : v.toFixed(2);
}
function pct(v: number) {
  const x = v * 100;
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(2)}%`;
}
