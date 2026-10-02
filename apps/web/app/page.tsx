"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader, StartLink } from "@/components/SiteHeader";
import { StrategyThread } from "@/components/StrategyThread";
import { ThoughtTrace } from "@/components/ThoughtTrace";

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

const INPUTS = [
  { k: "01", label: "Price" },
  { k: "02", label: "Volatility" },
  { k: "03", label: "Macro" },
  { k: "04", label: "News" },
  { k: "05", label: "Rates" },
  { k: "06", label: "Flow" },
];

const FAQ = [
  {
    q: "What is MoleculeAI?",
    a: "A research desk. You describe a trading idea in natural language. MoleculeAI builds the strategy, simulates it, and tests it.",
  },
  {
    q: "Do I need to write code?",
    a: "No. Start with a sentence. There is no formula sheet and no setup before the first backtest.",
  },
  {
    q: "Is this live money?",
    a: "No. The desk simulates the book. It does not place live orders.",
  },
  {
    q: "What does free include?",
    a: "The free plan includes one strategy in the portfolio. Pro is for unlimited backtests and strategies.",
  },
  {
    q: "Where do the numbers come from?",
    a: "From the engine, on recorded history. If a run did not produce a figure, the desk does not print one.",
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

function SignalField() {
  const [turn, setTurn] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      setTurn(((now - start) % 28000) / 28000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const angle = -Math.PI / 2 + turn * Math.PI * 2;
  const dotX = 50 + Math.cos(angle) * 30;
  const dotY = 50 + Math.sin(angle) * 30;
  const active = Math.round(turn * INPUTS.length) % INPUTS.length;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      <svg className="absolute inset-0 h-full w-full text-line" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.35" />
        <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="0.8 1.4" />
        {INPUTS.map((_, i) => {
          const a = ((-90 + i * 60) * Math.PI) / 180;
          return <line key={i} x1="50" y1="50" x2={50 + Math.cos(a) * 30} y2={50 + Math.sin(a) * 30} stroke="currentColor" strokeWidth="0.3" />;
        })}
      </svg>
      <div
        className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text shadow-[0_0_14px_rgba(232,234,237,0.85)]"
        style={{ left: `${dotX}%`, top: `${dotY}%` }}
        aria-hidden
      />
      <div className="absolute left-1/2 top-1/2 flex h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink-950">
        <img src="/icon-32.png" alt="" className="h-8 w-8" />
      </div>
      {INPUTS.map((item, i) => {
        const a = ((-90 + i * 60) * Math.PI) / 180;
        const x = 50 + Math.cos(a) * 30;
        const y = 50 + Math.sin(a) * 30;
        const on = i === active;
        return (
          <div key={item.k} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
            <div className={`whitespace-nowrap rounded-full border bg-ink-950 px-2.5 py-1 text-xs sm:px-3.5 sm:py-1.5 sm:text-[13px] transition-colors duration-300 ${on ? "border-text text-text" : "border-line text-mute"}`}>
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FaqList() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="border-t border-line">
      {FAQ.map((item, i) => {
        const on = open === i;
        return (
          <div key={item.q} className="border-b border-line">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-6 py-5 text-left"
              aria-expanded={on}
              onClick={() => setOpen(on ? null : i)}
            >
              <span className="text-base md:text-lg">{item.q}</span>
              <span
                className={`font-mono text-lg leading-none text-mute transition-transform duration-200 ${on ? "rotate-45" : ""}`}
                aria-hidden
              >
                +
              </span>
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-5 text-sm leading-relaxed text-mute">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
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
          <div className="hero-lattice pointer-events-none absolute inset-0" aria-hidden />
          <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-5 pb-8 pt-10 md:px-8 md:pb-20 md:pt-16 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-2 lg:gap-16 lg:pb-16">
            <div className="flex min-h-[calc(100svh-6.5rem)] flex-col lg:min-h-0">
              <p className="hero-in font-mono text-[11px] uppercase tracking-[0.22em] text-mute" style={{ animationDelay: "40ms" }}>
                MoleculeAI
              </p>
              <h1
                className="hero-in mt-5 max-w-3xl font-serif text-4xl font-medium leading-[1.02] tracking-tight sm:text-5xl lg:text-7xl"
                style={{ animationDelay: "120ms" }}
              >
                Frontier AI model
                <br />
                for agentic trading.
              </h1>
              <p
                className="hero-in mt-5 max-w-xl text-base leading-relaxed text-mute sm:text-lg"
                style={{ animationDelay: "220ms" }}
              >
                Describe a trading idea in natural language. MoleculeAI builds the strategy, simulates it, and tests it.
              </p>
              <ThoughtTrace compact />
              <div className="hero-in mt-6 lg:mt-8" style={{ animationDelay: "320ms" }}>
                <StartLink />
              </div>
              <div className="min-h-8 flex-1 lg:hidden" aria-hidden />
            </div>
            <ThoughtTrace />
          </div>
        </section>

        <section id="product" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 md:px-8 md:py-20">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute">Product</p>
            <h2 className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Describe the idea. The desk does the rest.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-mute">
              MoleculeAI builds the strategy, simulates it, and tests it.
            </p>
            <div className="mt-8">
              <StrategyThread />
            </div>
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

        <section id="features" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 py-14 md:px-8 md:py-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute">Features</p>
              <h2 className="mt-4 max-w-md font-serif text-4xl font-medium leading-[1.02] tracking-tight sm:text-5xl md:text-6xl">
                The test reads more than price.
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-mute">
                Price, volatility, macro, news, rates, and flow. MoleculeAI keeps the inputs that change the book and leaves the rest out.
              </p>
            </Reveal>
            <Reveal delay={80}>
              <SignalField />
            </Reveal>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 md:px-8 md:py-24">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute">FAQ</p>
              <h2 className="mt-4 font-serif text-4xl font-medium tracking-tight sm:text-5xl md:text-6xl">A few plain answers.</h2>
            </Reveal>
            <div className="mt-12">
              <FaqList />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
