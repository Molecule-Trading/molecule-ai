"use client";

import { useEffect, useState } from "react";

const USER = "Buy when the twenty-day return is positive and volatility is falling.";

const REPLY = [
  "Long only when both gates are on.",
  "Entry: twenty-session return above zero, and realized volatility below its own median.",
  "Exit when either gate fails. Costs stay in the path.",
  "Window is the recorded history on the desk. The engine writes the return and the drawdown. This page does not.",
];

export function StrategyThread() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(REPLY.length + 1);
      return;
    }
    const id = window.setInterval(() => {
      setPhase((v) => (v > REPLY.length + 1 ? 0 : v + 1));
    }, 1400);
    return () => window.clearInterval(id);
  }, []);

  const showUser = phase >= 1;
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
      <div className="flex min-h-[440px] flex-col gap-6 px-5 py-6 md:px-8 md:py-8" aria-live="polite">
        {showUser && (
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
              {lines.map((line, i) => (
                <p key={line} className="thread-in max-w-2xl text-sm leading-relaxed text-text">
                  {line}
                </p>
              ))}
              {lines.length === REPLY.length && (
                <div className="thread-in grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
                  {[
                    ["Rule", "Return > 0"],
                    ["Gate", "Vol falling"],
                    ["Window", "20 sessions"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-ink-950 px-3 py-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{k}</p>
                      <p className="mt-1 text-sm text-text">{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
