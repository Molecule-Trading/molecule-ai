"use client";

import { useEffect, useState } from "react";

const LINES = [
  "Reading the sentence.",
  "Twenty-session return, positive.",
  "Volatility has to be falling.",
  "Costs stay on the path.",
  "The run lands on the desk.",
];

export function ThoughtTrace({ compact = false }: { compact?: boolean }) {
  const [n, setN] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(LINES.length);
      return;
    }
    const id = window.setInterval(() => {
      setN((v) => (v >= LINES.length ? 1 : v + 1));
    }, 1300);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={compact ? "hero-in mt-8 w-full lg:hidden" : "hero-in hidden w-full justify-self-end lg:block"}
      style={{ animationDelay: "200ms" }}
      aria-hidden
    >
      <ol className={`flex w-full flex-col ${compact ? "max-w-sm" : "ml-auto max-w-md"}`}>
        {LINES.map((line, i) => {
          const on = i < n;
          const current = i === n - 1;
          return (
            <li key={line} className={`grid grid-cols-[22px_1fr] ${compact ? "gap-3" : "gap-5"}`}>
              <span className="flex flex-col items-center">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 rounded-full transition-all duration-500 ${
                    on ? "bg-text" : "bg-line"
                  } ${current ? "scale-125" : ""}`}
                />
                {i < LINES.length - 1 && (
                  <span className={`mt-1.5 w-px transition-colors duration-500 ${compact ? "h-6" : "h-16"} ${i < n - 1 ? "bg-text/40" : "bg-line"}`} />
                )}
              </span>
              <p
                className={`leading-snug transition-all duration-500 ${compact ? "text-sm" : "pt-0.5 text-xl xl:text-2xl"} ${
                  on ? "text-text opacity-100" : "text-mute opacity-25"
                }`}
              >
                {line}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
