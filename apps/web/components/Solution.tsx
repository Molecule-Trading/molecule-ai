"use client";

import { useEffect, useRef } from "react";

const STEPS = [
  {
    n: "01",
    title: "Natural Language",
    body: "Just describe the strategy you have in mind by cutting early iteration time to focus on high-leverage decisions.",
  },
  {
    n: "02",
    title: "Multi-agent",
    body: "Multiple agents work in parallel for deeper answers on the hardest questions.",
  },
  {
    n: "03",
    title: "Persistent Memory",
    body: "It learns your projects, auto-generates skills, and never forgets how it solved a problem.",
  },
  {
    n: "04",
    title: "Trade with confidence",
    body: "Built to drive real engineering work. Know the failure modes before you risk a dollar.",
  },
];

export function Solution() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const sec = root.current;
    if (!sec) return;
    const go = () => sec.classList.add("in");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      go();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          go();
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(sec);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={root} className="sol scroll-mt-20" id="solutions">
      <div className="w">
        <div className="eyebrow rv" style={{ "--i": 0 } as React.CSSProperties}>
          Solution
        </div>
        <h2 className="rv" style={{ "--i": 1 } as React.CSSProperties}>
          Anyone can trade
        </h2>
        <p className="lead rv" style={{ "--i": 2 } as React.CSSProperties}>
          Describe your strategy and let the MoleculeAI do the rest.
        </p>
        <div className="steps">
          {STEPS.map((step, i) => (
            <article key={step.n} className="st rv" style={{ "--i": i + 3 } as React.CSSProperties}>
              <span className="n">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
