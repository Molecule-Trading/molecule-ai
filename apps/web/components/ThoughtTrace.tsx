"use client";

import { useEffect, useState } from "react";

const LINES = [
  "Reading the sentence.",
  "Twenty-session return, positive.",
  "Volatility has to be falling.",
  "Costs stay on the path.",
  "The run lands on the desk.",
];

export function ThoughtTrace() {
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
    <div className="hero-in hidden w-full self-stretch lg:block" style={{ animationDelay: "200ms" }} aria-hidden>
      <ol className="flex h-full flex-col justify-start gap-0 pt-2">
        {LINES.map((line, i) => {
          const on = i < n;
          const current = i === n - 1;
          return (
            <li key={line} className="grid grid-cols-[18px_1fr] gap-4">
              <span className="flex flex-col items-center">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 rounded-full transition-all duration-500 ${
                    on ? "bg-text" : "bg-line"
                  } ${current ? "scale-125" : ""}`}
                />
                {i < LINES.length - 1 && (
                  <span className={`mt-1 h-12 w-px transition-colors duration-500 ${i < n - 1 ? "bg-text/40" : "bg-line"}`} />
                )}
              </span>
              <p
                className={`pt-0.5 text-[15px] leading-none transition-all duration-500 ${
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
