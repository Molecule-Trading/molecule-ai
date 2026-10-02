"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fanOf, splitOf, windowOf } from "@/lib/sampleBook";

const view = windowOf("MAX");
const split = splitOf(view.bars);
const fan = fanOf(view.bars);

function take(values: number[], n = 42) {
  if (values.length <= n) return values;
  const step = (values.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => values[Math.round(i * step)]);
}

const EQUITY = take(view.bars.map((b) => b.equity));
const P10 = take(fan.map((p) => p.p10));
const P50 = take(fan.map((p) => p.p50));
const P90 = take(fan.map((p) => p.p90));

function usePlay(steps: number, go: boolean, lag = 0) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!go) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(steps);
      return;
    }
    if (phase >= steps) return;
    const wait = phase === 0 ? 80 + lag : 560;
    const id = window.setTimeout(() => setPhase((p) => Math.min(steps, p + 1)), wait);
    return () => window.clearTimeout(id);
  }, [go, phase, steps, lag]);
  return phase;
}

function pathOf(values: number[]) {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = 2 + (i / (values.length - 1)) * 96;
      const y = 12 + (1 - (v - min) / span) * 76;
      return `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function LinePlot({ values, on, tone = "#e8eaed" }: { values: number[]; on: boolean; tone?: string }) {
  const d = useMemo(() => pathOf(values), [values]);
  if (!d) return null;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <line x1="2" y1="88" x2="98" y2="88" stroke="rgba(232,234,237,0.08)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      <path
        d={d}
        fill="none"
        stroke={tone}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={on ? 0 : 1}
        style={{ transition: "stroke-dashoffset 980ms cubic-bezier(0.22, 0.8, 0.2, 1)" }}
      />
    </svg>
  );
}

function Bubble({ children, show, right = false }: { children: ReactNode; show: boolean; right?: boolean }) {
  return (
    <p
      className={`max-w-[96%] rounded-2xl px-2.5 py-1.5 text-[11px] leading-snug transition duration-500 sm:text-xs ${
        right ? "ml-auto rounded-br-md bg-white/[0.06] text-text" : "text-text/90"
      } ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0"}`}
    >
      {children}
    </p>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-mute">{k}</p>
      <p className="mt-0.5 truncate font-mono text-[11px] text-text">{v}</p>
    </div>
  );
}

function pct(v: number | null) {
  if (v == null || Number.isNaN(v)) return "—";
  const x = v * 100;
  return `${x > 0 ? "+" : ""}${x.toFixed(1)}%`;
}

function num(v: number | null) {
  return v == null ? "—" : v.toFixed(2);
}

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <article className="flex h-[232px] flex-col overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#121316] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:h-[300px] lg:h-[340px]">
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3 sm:gap-2.5 sm:p-4">{children}</div>
      <div className="flex items-center justify-between border-t border-white/[0.06] px-3.5 py-2.5">
        <span className="text-[13px] text-text">{label}</span>
        <Link href="/login" className="text-[13px] text-mute transition-colors hover:text-text">
          Explore <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}

function ResearchTile({ go }: { go: boolean }) {
  const phase = usePlay(4, go, 0);
  return (
    <Tile label="Research">
      <Bubble show={phase >= 1} right>
        Buy when the twenty-day return is positive and volatility is falling.
      </Bubble>
      <Bubble show={phase >= 2}>
        <strong className="font-semibold">Entry</strong> is the close, and only if both gates are on.
      </Bubble>
      <div className={`min-h-0 flex-1 transition-opacity duration-500 ${phase >= 3 ? "opacity-100" : "opacity-0"}`}>
        <LinePlot values={EQUITY} on={phase >= 3} tone="#34d399" />
      </div>
      <div className={`grid grid-cols-3 gap-2 transition duration-500 ${phase >= 4 ? "opacity-100" : "opacity-0"}`}>
        <Mini k="Return" v={pct(view.metrics.total_return)} />
        <Mini k="Sharpe" v={num(view.metrics.sharpe)} />
        <Mini k="Max DD" v={pct(view.metrics.max_drawdown)} />
      </div>
    </Tile>
  );
}

function PaperTile({ go }: { go: boolean }) {
  const phase = usePlay(6, go, 160);
  return (
    <Tile label="Paper">
      <div className={`flex items-center gap-2 transition duration-500 ${phase >= 1 ? "opacity-100" : "opacity-0"}`}>
        <span className="grid h-6 w-6 place-items-center rounded-md border border-line bg-ink-950 font-mono text-[8px] text-mute">PDF</span>
        <span className="truncate text-[11px] text-mute">strategy_note.pdf</span>
      </div>
      <Bubble show={phase >= 2} right>
        Backtest this strategy paper for me.
      </Bubble>
      <div className="min-h-[1.1rem]">
        {phase === 3 && (
          <p className="flex items-center gap-2 text-[11px] text-mute">
            Thinking
            <span className="inline-flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1 w-1 animate-pulse rounded-full bg-mute" style={{ animationDelay: `${i * 140}ms` }} />
              ))}
            </span>
          </p>
        )}
        <p className={`text-[11px] leading-snug text-mute transition duration-500 ${phase >= 4 ? "opacity-100" : "opacity-0"}`}>
          The note became a daily rule. The line is the book.
        </p>
      </div>
      <div className={`min-h-0 flex-1 transition-opacity duration-500 ${phase >= 5 ? "opacity-100" : "opacity-0"}`}>
        <LinePlot values={EQUITY} on={phase >= 5} />
      </div>
      <div className={`grid grid-cols-3 gap-2 transition duration-500 ${phase >= 6 ? "opacity-100" : "opacity-0"}`}>
        <Mini k="Return" v={pct(view.metrics.total_return)} />
        <Mini k="Sharpe" v={num(view.metrics.sharpe)} />
        <Mini k="Trades" v={String(view.metrics.trade_count)} />
      </div>
    </Tile>
  );
}

function MonteTile({ go }: { go: boolean }) {
  const phase = usePlay(4, go, 280);
  return (
    <Tile label="Simulate">
      <Bubble show={phase >= 1} right>
        Run a Monte Carlo on my crypto strategy, with in-sample and out-of-sample data.
      </Bubble>
      <p className={`text-[11px] leading-snug text-mute transition duration-500 ${phase >= 2 ? "opacity-100" : "opacity-0"}`}>
        Paths redrawn from the daily book. Split is seventy, thirty.
      </p>
      <div className={`relative min-h-0 flex-1 transition-opacity duration-500 ${phase >= 3 ? "opacity-100" : "opacity-0"}`}>
        <LinePlot values={P90} on={phase >= 3} tone="rgba(232,234,237,0.35)" />
        <div className="absolute inset-0">
          <LinePlot values={P10} on={phase >= 3} tone="rgba(232,234,237,0.35)" />
        </div>
        <div className="absolute inset-0">
          <LinePlot values={P50} on={phase >= 3} tone="#e8eaed" />
        </div>
      </div>
      <div className={`grid grid-cols-2 gap-2 transition duration-500 ${phase >= 4 ? "opacity-100" : "opacity-0"}`}>
        <Mini k="In sample" v={pct(split.inn.cagr)} />
        <Mini k="Out of sample" v={pct(split.out.cagr)} />
      </div>
    </Tile>
  );
}

function VoiceTile({ go }: { go: boolean }) {
  const phase = usePlay(4, go, 400);
  const listening = phase === 1;
  return (
    <Tile label="Voice">
      <div className={`flex items-center gap-2.5 transition duration-500 ${phase >= 1 ? "opacity-100" : "opacity-0"}`}>
        <span className="grid h-7 w-7 place-items-center rounded-full border border-line bg-ink-950">
          <span className={`h-2 w-2 rounded-full bg-text ${listening ? "animate-pulse" : ""}`} />
        </span>
        <span className="flex h-5 items-end gap-[3px]" aria-hidden>
          {[0.4, 0.75, 1, 0.55, 0.9, 0.45, 0.7, 0.5].map((h, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-text/80"
              style={{
                height: `${Math.round(h * 18)}px`,
                transformOrigin: "bottom",
                animation: listening ? `voice-eq 900ms ${i * 70}ms ease-in-out infinite` : undefined,
              }}
            />
          ))}
        </span>
      </div>
      <Bubble show={phase >= 2}>
        Buy Palantir before every earnings call over the last year. What does the return look like?
      </Bubble>
      <div className={`min-h-0 flex-1 transition-opacity duration-500 ${phase >= 3 ? "opacity-100" : "opacity-0"}`}>
        <LinePlot values={EQUITY} on={phase >= 3} tone="#34d399" />
      </div>
      <p className={`font-mono text-[10px] uppercase tracking-[0.14em] text-mute transition duration-500 ${phase >= 4 ? "opacity-100" : "opacity-0"}`}>
        Equity · line of the book
      </p>
    </Tile>
  );
}

export function ProductGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setGo(true);
          io.disconnect();
        }
      },
      { threshold: 0.22 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-2 gap-3 md:gap-4">
      <ResearchTile go={go} />
      <PaperTile go={go} />
      <MonteTile go={go} />
      <VoiceTile go={go} />
    </div>
  );
}
