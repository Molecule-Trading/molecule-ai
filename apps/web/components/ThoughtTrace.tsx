"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Reading the sentence",
  "Momentum, twenty sessions",
  "Volatility has to be falling",
  "Costs stay on the path",
  "Paper it if the path holds",
];

export function ThoughtTrace() {
  const [n, setN] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(STEPS.length);
      return;
    }
    const id = window.setInterval(() => {
      setN((v) => (v >= STEPS.length ? 1 : v + 1));
    }, 1400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <aside className="hero-in w-full max-w-md justify-self-end rounded-2xl border border-line bg-ink-950/70 p-5 backdrop-blur-md" style={{ animationDelay: "280ms" }}>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mute">Chain of thought</p>
        <span className="font-mono text-[11px] text-mute">MoleculeAI</span>
      </div>
      <ol className="mt-5">
        {STEPS.map((step, i) => {
          const on = i < n;
          const current = i === n - 1;
          return (
            <li key={step} className="grid grid-cols-[16px_1fr] gap-3">
              <span className="flex flex-col items-center">
                <span
                  className={`mt-1 h-2 w-2 rounded-full transition-colors duration-500 ${
                    on ? "bg-text" : "bg-line"
                  } ${current ? "scale-110" : ""}`}
                />
                {i < STEPS.length - 1 && (
                  <span className={`my-1 w-px flex-1 transition-colors duration-500 ${i < n - 1 ? "bg-text/50" : "bg-line"}`} />
                )}
              </span>
              <p
                className={`pb-4 text-sm leading-relaxed transition-all duration-500 ${
                  on ? "translate-y-0 text-text opacity-100" : "translate-y-1 text-mute opacity-30"
                }`}
              >
                {step}
              </p>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
