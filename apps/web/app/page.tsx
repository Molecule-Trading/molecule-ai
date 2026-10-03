"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Features } from "@/components/Features";
import { Showcase } from "@/components/Showcase";

const WHY = [
  {
    n: "01",
    title: "Talk to it",
    body: "No code, no formulas, no setup. Just describe the strategy you have in mind.",
  },
  {
    n: "02",
    title: "Backtest it",
    body: "See how it would have performed across years of real market data: bull runs, crashes, and sideways grinds.",
  },
  {
    n: "03",
    title: "Trade with confidence",
    body: "Know the failure modes before you risk a dollar. Fix them with your agent before going live.",
  },
];

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setOn(true);
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`rise ${on ? "show" : ""} ${className}`}>
      {children}
    </div>
  );
}

export default function Home() {
  useEffect(() => {
    document.documentElement.classList.add("m-motion");
    return () => document.documentElement.classList.remove("m-motion");
  }, []);

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-2 pt-16 text-center md:px-8 md:pt-28">
            <h1
              className="hero-in font-sans text-[clamp(2.7rem,6.6vw,5.35rem)] font-medium leading-[1.04] tracking-[-0.035em] text-text"
              style={{ animationDelay: "40ms" }}
            >
              Frontier AI model
              <br />
              for agentic <span className="underline decoration-white/90 decoration-[1.5px] underline-offset-[0.14em]">trading.</span>
            </h1>
            <p
              className="hero-in mt-6 max-w-xl text-base leading-relaxed text-mute sm:text-lg"
              style={{ animationDelay: "140ms" }}
            >
              Describe a trading idea in natural language. MoleculeAI builds the strategy, simulates it, and tests it.
            </p>
            <div className="hero-in mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "220ms" }}>
              <Link
                href="/login"
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-medium text-black transition hover:opacity-90"
              >
                Get started for free
                <span aria-hidden>›</span>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center rounded-full bg-[#1c1e22] px-5 text-sm font-medium text-text transition hover:bg-[#26292e]"
              >
                View pricing
              </Link>
            </div>
          </div>
          <div id="product" className="mx-auto mt-14 w-full max-w-[1080px] scroll-mt-20 px-3 pb-10 sm:px-5 md:mt-20 md:pb-16">
            <Showcase />
          </div>
        </section>

        <section id="solutions" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 md:px-8 md:py-24">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute">Solution</p>
              <h2 className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-7xl">
                Anyone can trade
              </h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-mute">
                You don't need a quant degree or a Bloomberg terminal.
                <br />
                Describe your strategy in natural language and let the AI do the rest.
              </p>
            </Reveal>
            <div className="mt-8 grid border border-line md:mt-14 md:grid-cols-3">
              {WHY.map((item, i) => (
                <Reveal key={item.n} delay={i * 90} className="h-full">
                  <article className="h-full border-b border-line px-4 py-4 transition duration-200 last:border-b-0 hover:-translate-y-0.5 hover:bg-ink-900 md:border-b-0 md:border-r md:px-6 md:py-8 md:last:border-r-0">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-sm font-semibold md:text-base">{item.title}</h3>
                      <span className="font-mono text-[11px] text-mute md:text-xs">{item.n}</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-snug text-mute md:mt-4 md:text-sm md:leading-relaxed">{item.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <Features />

      </main>
      <SiteFooter />
    </div>
  );
}
