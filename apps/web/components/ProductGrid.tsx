"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { DrawdownChart, EquityChart, MonteCarloChart } from "@/components/Charts";
import { fanOf, splitOf, windowOf } from "@/lib/sampleBook";

const view = windowOf("MAX");
const split = splitOf(view.bars);
const fan = fanOf(view.bars);

function useInView() {
  const ref = useRef<HTMLElement>(null);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGo(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setGo(true);
          io.disconnect();
        }
      },
      { threshold: 0.32, rootMargin: "48px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, go };
}

function useStage(steps: number, go: boolean, scroller: RefObject<HTMLDivElement | null>) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!go) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(steps);
      return;
    }
    if (phase >= steps) return;
    const wait = phase === 0 ? 70 : 620;
    const id = window.setTimeout(() => setPhase((p) => Math.min(steps, p + 1)), wait);
    return () => window.clearTimeout(id);
  }, [go, phase, steps]);

  useEffect(() => {
    const el = scroller.current;
    if (!el || phase < 1) return;
    const node = el.querySelector(`[data-phase="${phase}"]`) as HTMLElement | null;
    if (!node) return;
    el.scrollTo({ top: Math.max(0, node.offsetTop - 10), behavior: "smooth" });
  }, [phase, scroller]);

  return phase;
}

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "—";
  const x = v * 100;
  return `${x > 0 ? "+" : ""}${x.toFixed(2)}%`;
}

function num(v: number | null | undefined) {
  return v == null ? "—" : v.toFixed(2);
}

function tone(v: number | null | undefined, down = false) {
  if (down || (v != null && v < 0)) return "text-red-400";
  if (v != null && v > 0) return "text-emerald-400";
  return "text-text";
}

function Mark() {
  return <img src="/icon-32.png" alt="" className="h-4 w-4 shrink-0" />;
}

function Think({ show, label }: { show: boolean; label: string }) {
  if (!show) return null;
  return (
    <p data-phase="think" className="thread-in flex items-center gap-2 text-[12px] text-mute">
      {label}
      <span className="inline-flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1 w-1 animate-pulse rounded-full bg-mute" style={{ animationDelay: `${i * 140}ms` }} />
        ))}
      </span>
    </p>
  );
}

function UserLine({ show, phase, children }: { show: boolean; phase: number; children: ReactNode }) {
  if (!show) return null;
  return (
    <div data-phase={phase} className="thread-in flex justify-end">
      <p className="max-w-[92%] rounded-2xl rounded-br-md bg-ink-800 px-3 py-2 text-[12px] leading-relaxed text-text sm:text-[13px]">{children}</p>
    </div>
  );
}

function Agent({ show, phase, children }: { show: boolean; phase: number; children: ReactNode }) {
  if (!show) return null;
  return (
    <div data-phase={phase} className="thread-in flex gap-2">
      <Mark />
      <div className="min-w-0 flex-1 space-y-2 text-[12px] leading-relaxed text-text sm:text-[13px]">{children}</div>
    </div>
  );
}

function Metric({ k, v, bad, good }: { k: string; v: string; bad?: boolean; good?: boolean }) {
  return (
    <div className="min-w-0 bg-ink-950 px-2 py-2 sm:px-2.5 sm:py-2.5">
      <p className="truncate font-mono text-[8px] uppercase tracking-[0.12em] text-mute sm:text-[9px]">{k}</p>
      <p className={`mt-1 truncate font-mono text-[11px] leading-none sm:text-xs ${bad ? "text-red-400" : good ? "text-emerald-400" : "text-text"}`}>{v}</p>
    </div>
  );
}

function Reveal({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <div
      className="overflow-hidden transition-[clip-path,opacity] duration-1000 ease-out"
      style={{ clipPath: on ? "inset(0 0 0 0)" : "inset(0 100% 0 0)", opacity: on ? 1 : 0 }}
    >
      {children}
    </div>
  );
}

function Shell({
  label,
  rootRef,
  scroller,
  children,
}: {
  label: string;
  rootRef: RefObject<HTMLElement | null>;
  scroller: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <article
      ref={rootRef}
      className="flex h-[440px] flex-col overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#101114] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:h-[500px] lg:h-[540px]"
    >
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Mark />
          <p className="text-[13px] text-text">MoleculeAI</p>
        </div>
        <p className="font-mono text-[10px] text-mute">molecule 1.0</p>
      </div>
      <div ref={scroller} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-3.5 sm:py-4">
        <div className="flex min-h-full flex-col gap-3">{children}</div>
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.06] px-3.5 py-2.5">
        <span className="text-[13px] text-text">{label}</span>
        <Link href="/login" className="text-[13px] text-mute transition-colors hover:text-text">
          Explore <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}

function ResearchTile() {
  const { ref, go } = useInView();
  const scroller = useRef<HTMLDivElement>(null);
  const phase = useStage(7, go, scroller);
  const m = view.metrics;
  return (
    <Shell label="Simulate" rootRef={ref} scroller={scroller}>
      <UserLine show={phase >= 1} phase={1}>
        Buy when the twenty-day return is positive and volatility is falling.
      </UserLine>
      <Think show={phase === 2} label="Reading the rule" />
      {phase >= 3 && (
        <Agent show phase={3}>
          <p>Long only when both gates are on.</p>
          {phase >= 4 && (
            <p data-phase={4} className="thread-in">
              <strong className="font-semibold">Entry</strong> when the twenty-session return is above zero and realized volatility is below its own median.
            </p>
          )}
          {phase >= 5 && (
            <p data-phase={5} className="thread-in">
              <strong className="font-semibold">Exit</strong> when either gate fails. Costs stay on the path.
            </p>
          )}
          {phase >= 6 && (
            <div data-phase={6} className="thread-in grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-6">
              <Metric k="CAGR" v={pct(m.cagr)} good={(m.cagr ?? 0) > 0} bad={(m.cagr ?? 0) < 0} />
              <Metric k="Sharpe" v={num(m.sharpe)} good={(m.sharpe ?? 0) > 0} />
              <Metric k="Sortino" v={num(m.sortino)} good={(m.sortino ?? 0) > 0} />
              <Metric k="Calmar" v={num(m.calmar)} good={(m.calmar ?? 0) > 0} />
              <Metric k="Max DD" v={pct(m.max_drawdown)} bad />
              <Metric k="Trades" v={String(view.trades.length)} />
            </div>
          )}
          {phase >= 7 && (
            <div data-phase={7} className="thread-in grid grid-cols-2 gap-2">
              <div className="min-w-0 rounded-xl border border-line bg-ink-950/50 px-1.5 py-2">
                <p className="mb-1 px-1 text-[10px] text-mute">Equity curve</p>
                <Reveal on>
                  <EquityChart data={view.bars} height={128} />
                </Reveal>
              </div>
              <div className="min-w-0 rounded-xl border border-line bg-ink-950/50 px-1.5 py-2">
                <p className="mb-1 px-1 text-[10px] text-mute">Underwater</p>
                <Reveal on>
                  <DrawdownChart data={view.bars} height={128} />
                </Reveal>
              </div>
            </div>
          )}
        </Agent>
      )}
    </Shell>
  );
}

function PaperTile() {
  const { ref, go } = useInView();
  const scroller = useRef<HTMLDivElement>(null);
  const phase = useStage(6, go, scroller);
  const m = view.metrics;
  return (
    <Shell label="Notions" rootRef={ref} scroller={scroller}>
      {phase >= 1 && (
        <div data-phase={1} className="thread-in flex items-center gap-2.5 rounded-xl border border-line bg-ink-950/70 px-2.5 py-2">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-line bg-ink-900 font-mono text-[9px] text-mute">PDF</span>
          <span className="min-w-0">
            <span className="block truncate text-[12px] text-text">strategy_note.pdf</span>
            <span className="block font-mono text-[10px] text-mute">Attached · 6 pages</span>
          </span>
        </div>
      )}
      <UserLine show={phase >= 2} phase={2}>
        Backtest this strategy paper for me.
      </UserLine>
      <Think show={phase === 3} label="Reading the note" />
      {phase >= 4 && (
        <Agent show phase={4}>
          <p>The note became a daily rule. Long only when the twenty-session return is above zero and realized volatility is under its own median.</p>
          {phase >= 5 && <p className="text-mute">Entry is the next open. Fees stay on the path. The line is the book.</p>}
          {phase >= 5 && (
            <div data-phase={5} className="rounded-xl border border-line bg-ink-950/50 px-1.5 py-2">
              <p className="mb-1 px-1 text-[10px] text-mute">Equity curve</p>
              <Reveal on={phase >= 5}>
                <EquityChart data={view.bars} height={148} />
              </Reveal>
            </div>
          )}
          {phase >= 6 && (
            <div data-phase={6} className="thread-in grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-line bg-line">
              <Metric k="Return" v={pct(m.total_return)} good={(m.total_return ?? 0) > 0} bad={(m.total_return ?? 0) < 0} />
              <Metric k="Sharpe" v={num(m.sharpe)} good={(m.sharpe ?? 0) > 0} />
              <Metric k="Max DD" v={pct(m.max_drawdown)} bad />
              <Metric k="Trades" v={String(view.trades.length)} />
            </div>
          )}
        </Agent>
      )}
    </Shell>
  );
}

function MonteTile() {
  const { ref, go } = useInView();
  const scroller = useRef<HTMLDivElement>(null);
  const phase = useStage(5, go, scroller);
  return (
    <Shell label="Monte Carlo" rootRef={ref} scroller={scroller}>
      <UserLine show={phase >= 1} phase={1}>
        Run a Monte Carlo on my crypto strategy, with in-sample and out-of-sample data.
      </UserLine>
      <Think show={phase === 2} label="Resampling the book" />
      {phase >= 3 && (
        <Agent show phase={3}>
          <p>Paths redrawn from the daily book. The split is seventy, thirty. The fan is the 10th, the median, and the 90th.</p>
          {phase >= 4 && (
            <div data-phase={4} className="rounded-xl border border-line bg-ink-950/50 px-1.5 py-2">
              <p className="mb-1 px-1 text-[10px] text-mute">Monte Carlo</p>
              <Reveal on={phase >= 4}>
                <MonteCarloChart data={fan} height={168} />
              </Reveal>
            </div>
          )}
          {phase >= 5 && (
            <div data-phase={5} className="thread-in grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
              <div className="bg-ink-950 px-2.5 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-mute">In sample</p>
                <p className={`mt-1 font-mono text-sm ${tone(split.inn.cagr)}`}>{pct(split.inn.cagr)}</p>
                <p className="mt-1 font-mono text-[10px] text-mute">Sharpe {num(split.inn.sharpe)}</p>
              </div>
              <div className="bg-ink-950 px-2.5 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-mute">Out of sample</p>
                <p className={`mt-1 font-mono text-sm ${tone(split.out.cagr)}`}>{pct(split.out.cagr)}</p>
                <p className="mt-1 font-mono text-[10px] text-mute">Sharpe {num(split.out.sharpe)}</p>
              </div>
            </div>
          )}
        </Agent>
      )}
    </Shell>
  );
}

function VoiceTile() {
  const { ref, go } = useInView();
  const scroller = useRef<HTMLDivElement>(null);
  const phase = useStage(5, go, scroller);
  const listening = phase === 1;
  return (
    <Shell label="Natural Language" rootRef={ref} scroller={scroller}>
      {phase >= 1 && (
        <div data-phase={1} className="thread-in flex items-center gap-3">
          <span className={`grid h-9 w-9 place-items-center rounded-full border border-line bg-ink-950 ${listening ? "ring-2 ring-white/15" : ""}`}>
            <span className={`h-2.5 w-2.5 rounded-full bg-text ${listening ? "animate-pulse" : ""}`} />
          </span>
          <span className="flex h-6 items-end gap-[3px]" aria-hidden>
            {[0.35, 0.7, 1, 0.5, 0.85, 0.4, 0.75, 0.55, 0.9].map((h, i) => (
              <span
                key={i}
                className="w-[3px] origin-bottom rounded-full bg-text/85"
                style={{
                  height: 20,
                  transform: `scaleY(${listening ? h : 0.35})`,
                  animation: listening ? `voice-eq 860ms ${i * 60}ms ease-in-out infinite` : undefined,
                }}
              />
            ))}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{listening ? "Listening" : "Heard"}</span>
        </div>
      )}
      <UserLine show={phase >= 2} phase={2}>
        Buy Palantir before every earnings call over the last year. What does the return look like?
      </UserLine>
      <Think show={phase === 3} label="Marking the prints" />
      {phase >= 4 && (
        <Agent show phase={4}>
          <p>Long the session before each print, flat the session after. The line is that book.</p>
          {phase >= 5 && (
            <div data-phase={5} className="rounded-xl border border-line bg-ink-950/50 px-1.5 py-2">
              <p className="mb-1 px-1 text-[10px] text-mute">Equity curve</p>
              <Reveal on={phase >= 5}>
                <EquityChart data={view.bars} height={156} />
              </Reveal>
            </div>
          )}
        </Agent>
      )}
    </Shell>
  );
}

export function ProductGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
      <ResearchTile />
      <PaperTile />
      <MonteTile />
      <VoiceTile />
    </div>
  );
}
