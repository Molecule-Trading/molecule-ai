"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader, StartLink } from "@/components/SiteHeader";

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

const PRODUCT = [
  {
    n: "01",
    title: "Research",
    body: "One field. Describe the idea in a sentence, attach a note, or say it out loud.",
  },
  {
    n: "02",
    title: "Simulate",
    body: "Molecule builds the strategy and runs it on recorded history. The numbers come from the engine.",
  },
  {
    n: "03",
    title: "Paper",
    body: "Deploy what holds up to the book. Watch it. Stop it when the idea is done.",
  },
];

const FAQ = [
  {
    q: "What is Molecule?",
    a: "A research desk. You describe a trading idea in natural language. Molecule builds the strategy, simulates it, and lets you paper it.",
  },
  {
    q: "Do I need to write code?",
    a: "No. Start with a sentence. There is no formula sheet and no setup before the first backtest.",
  },
  {
    q: "Is this live money?",
    a: "No. A deployed strategy runs on the paper book. You can stop it whenever the idea is finished.",
  },
  {
    q: "What does free include?",
    a: "The free plan includes one deployed paper strategy. Pro is for unlimited backtests and deployed strategies.",
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

function FaqList() {
  const [open, setOpen] = useState<number | null>(0);

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
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden">
          <div className="hero-lattice pointer-events-none absolute inset-0" aria-hidden />
          <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-end px-5 pb-20 pt-24 md:justify-center md:px-8 md:pb-28 md:pt-16">
            <p className="hero-in font-mono text-[11px] uppercase tracking-[0.22em] text-mute" style={{ animationDelay: "40ms" }}>
              Molecule
            </p>
            <h1
              className="hero-in mt-5 max-w-4xl font-serif text-5xl font-medium leading-[1.02] tracking-tight md:text-7xl lg:text-8xl"
              style={{ animationDelay: "120ms" }}
            >
              A desk for the hypothesis, then the book.
            </h1>
            <p
              className="hero-in mt-6 max-w-xl text-base leading-relaxed text-mute md:text-lg"
              style={{ animationDelay: "220ms" }}
            >
              Describe a trading idea in natural language. MoleculeAi builds the strategy, simulates it, and tests it.
            </p>
            <div className="hero-in mt-8" style={{ animationDelay: "320ms" }}>
              <StartLink />
            </div>
          </div>
        </section>

        <section id="why" className="scroll-mt-20 mx-auto w-full max-w-6xl px-5 py-24 md:px-8 md:py-32">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute">Why Molecule</p>
            <h2 className="mt-5 max-w-3xl font-serif text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
              Anyone can trade
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-mute">
              You don't need a quant degree or a Bloomberg terminal.
              <br />
              Describe your strategy in natural language and let the AI do the rest.
            </p>
          </Reveal>
          <div className="mt-14 grid border border-line md:grid-cols-3">
            {WHY.map((item, i) => (
              <Reveal key={item.n} delay={i * 90} className="h-full">
                <article className="h-full border-b border-line px-6 py-8 transition-colors duration-200 last:border-b-0 hover:bg-ink-900 md:border-b-0 md:border-r md:last:border-r-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-base font-semibold">{item.title}</h3>
                    <span className="font-mono text-xs text-mute">{item.n}</span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-mute">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="product" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-24 md:px-8 md:py-32">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute">Product</p>
              <h2 className="mt-5 max-w-3xl font-serif text-4xl font-medium leading-tight tracking-tight md:text-6xl">
                From a sentence to a paper book.
              </h2>
            </Reveal>
            <div className="mt-14 divide-y divide-line border-y border-line">
              {PRODUCT.map((item, i) => (
                <Reveal key={item.n} delay={i * 80}>
                  <article className="grid gap-3 py-8 md:grid-cols-12 md:items-baseline md:gap-8">
                    <span className="font-mono text-xs text-mute md:col-span-1">{item.n}</span>
                    <h3 className="font-serif text-3xl md:col-span-4">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-mute md:col-span-7 md:text-base">{item.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-24 md:px-8 md:py-32">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute">FAQ</p>
              <h2 className="mt-5 font-serif text-4xl font-medium tracking-tight md:text-6xl">A few plain answers.</h2>
            </Reveal>
            <div className="mt-12">
              <FaqList />
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start px-5 py-24 md:px-8 md:py-32">
            <Reveal>
              <h2 className="max-w-3xl font-serif text-4xl font-medium leading-tight tracking-tight md:text-6xl">
                Describe the idea. The desk does the rest.
              </h2>
              <div className="mt-8">
                <StartLink />
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
