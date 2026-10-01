"use client";

import { useEffect, useState } from "react";

const BEATS = [
  { kind: "user" as const, text: "Buy when the twenty-day return is positive and volatility is falling. Paper it." },
  { kind: "think" as const, text: "Understanding the hypothesis" },
  { kind: "think" as const, text: "Selecting the market" },
  { kind: "think" as const, text: "Building the rule" },
  { kind: "think" as const, text: "Running the recorded path" },
  {
    kind: "assistant" as const,
    text: "Built. Momentum filter, a volatility gate, costs on. The path is on the book as a paper run.",
  },
];

export function StrategyThread() {
  const [shown, setShown] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(BEATS.length);
      return;
    }
    const id = window.setInterval(() => {
      setShown((v) => (v >= BEATS.length ? 1 : v + 1));
    }, 1100);
    return () => window.clearInterval(id);
  }, []);

  const visible = BEATS.slice(0, shown);
  const thoughts = visible.filter((b) => b.kind === "think");
  const assistant = visible.find((b) => b.kind === "assistant");

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/80">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm text-text">MoleculeAI</p>
        <p className="font-mono text-[11px] text-mute">molecule 1.0</p>
      </div>
      <div className="flex min-h-[340px] flex-col gap-5 px-4 py-5 md:px-6" aria-live="polite">
        {visible
          .filter((b) => b.kind === "user")
          .map((b) => (
            <div key={b.text} className="flex justify-end">
              <p className="max-w-[34rem] rounded-2xl rounded-br-md bg-ink-800 px-4 py-3 text-sm leading-relaxed text-text thread-in">
                {b.text}
              </p>
            </div>
          ))}

        {(thoughts.length > 0 || assistant) && (
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-[10px] text-mute">
              M
            </span>
            <div className="min-w-0 flex-1">
              {thoughts.length > 0 && (
                <div className="thread-in rounded-xl border border-line bg-ink-950/60 px-3 py-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">Chain of thought</p>
                  <ul className="mt-2 space-y-1.5">
                    {thoughts.map((step) => (
                      <li key={step.text} className="flex items-center gap-2 text-sm text-mute">
                        <span className="h-1.5 w-1.5 rounded-full bg-text/80" />
                        {step.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {assistant && (
                <p className="thread-in mt-3 max-w-[36rem] text-sm leading-relaxed text-text">{assistant.text}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
