"use client";

import { useEffect, useRef, useState } from "react";
import { DistChart, DrawdownChart, EquityChart, MonteCarloChart } from "@/components/Charts";
import { fanOf, histOf, splitOf, windowOf } from "@/lib/sampleBook";

const USER = "Buy when the twenty-day return is positive and volatility is falling.";

const REPLY = [
  { text: "Long only when both gates are on. No short book, no override.", strong: "" },
  { text: "Entry is the close, and only if the twenty-session return is above zero and realized volatility is under its own 60-session median.", strong: "Entry" },
  { text: "Exit the same session either gate fails. The position does not carry on discretion.", strong: "Exit" },
  { text: "Fees are 10 bps and slippage is 5 bps, charged on the turn. Holding a name does not pay the fee again.", strong: "" },
  { text: "The path is marked daily against a buy-and-hold benchmark. The first 70% of the window is in sample. The rest is out of sample.", strong: "" },
];

const view = windowOf("MAX");
const m = view.metrics;
const dist = histOf(view.bars.slice(1).map((b, i) => b.equity / view.bars[i].equity - 1));
const vols: number[] = [];
{
  const rets = view.bars.slice(1).map((b, i) => b.equity / view.bars[i].equity - 1);
  for (let i = 20; i <= rets.length; i++) {
    const w = rets.slice(i - 20, i);
    const mean = w.reduce((s, x) => s + x, 0) / w.length;
    const sd = Math.sqrt(w.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, w.length - 1));
    vols.push(sd * Math.sqrt(252));
  }
}
const volDist = histOf(vols);
const split = splitOf(view.bars);
const fan = fanOf(view.bars);

export function StrategyThread() {
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState(0);
  const last = REPLY.length + 7;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(last);
      setStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.28 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [last]);

  useEffect(() => {
    if (!started || phase >= last) return;
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const delay = phase === 0 ? 160 : narrow ? 1200 : 720;
    const timer = window.setTimeout(() => setPhase((p) => Math.min(last, p + 1)), delay);
    return () => window.clearTimeout(timer);
  }, [started, phase, last]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (phase === 0) {
      el.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const node = el.querySelector(`[data-phase="${phase}"]`);
    if (!node) return;
    const top = node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
    el.scrollTo({ top: Math.max(0, top - 8), behavior: "auto" });
  }, [phase]);

  const lines = REPLY.slice(0, Math.max(0, phase - 1));

  return (
    <div ref={root} className="overflow-hidden rounded-2xl border border-line bg-ink-900/60">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <img src="/icon-32.png" alt="" className="h-5 w-5" />
          <p className="text-sm text-text">MoleculeAI</p>
        </div>
        <p className="font-mono text-[11px] text-mute">molecule 1.0</p>
      </div>
      <div ref={scroller} className="no-scrollbar h-[24rem] overflow-y-auto px-4 py-5 sm:h-[32rem] sm:px-5 md:h-[36rem] md:px-8 md:py-6">
        <div className="flex min-h-full flex-col gap-5">
          {phase >= 1 && (
            <div className="flex justify-end">
              <p className="thread-in max-w-xl rounded-2xl rounded-br-md bg-ink-800 px-4 py-3 text-sm leading-relaxed text-text">{USER}</p>
            </div>
          )}
          {lines.length > 0 && (
            <div className="flex gap-3">
              <img src="/icon-32.png" alt="" className="mt-0.5 h-7 w-7 shrink-0" />
              <div className="min-w-0 flex-1 space-y-3">
                {lines.map((line) => (
                  <p key={line.text} className="thread-in max-w-2xl text-sm leading-relaxed text-text">
                    {line.strong ? <strong className="font-semibold">{line.strong}</strong> : null}
                    {line.strong ? line.text.slice(line.strong.length) : line.text}
                  </p>
                ))}
                {phase > REPLY.length && (
                  <div data-phase={REPLY.length + 1} className="thread-in grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-6">
                    <Metric k="CAGR" v={pct(m.cagr)} tone={m.cagr} />
                    <Metric k="Sharpe" v={num(m.sharpe)} tone={m.sharpe} />
                    <Metric k="Sortino" v={num(m.sortino)} tone={m.sortino} />
                    <Metric k="Calmar" v={num(m.calmar)} tone={m.calmar} />
                    <Metric k="Max DD" v={pct(m.max_drawdown)} down />
                    <Metric k="Trades" v={String(view.trades.length)} />
                  </div>
                )}
                {phase > REPLY.length + 1 && (
                  <div data-phase={REPLY.length + 2} className="thread-in rounded-xl border border-line bg-ink-950/50 px-3 py-3">
                    <p className="mb-1 text-xs text-mute">Equity curve</p>
                    <EquityChart data={view.bars} height={200} />
                  </div>
                )}
                {phase > REPLY.length + 2 && (
                  <div data-phase={REPLY.length + 3} className="thread-in rounded-xl border border-line bg-ink-950/50 px-3 py-3">
                    <p className="mb-1 text-xs text-mute">Underwater Drawdown Plot</p>
                    <DrawdownChart data={view.bars} height={200} />
                  </div>
                )}
                {phase > REPLY.length + 3 && (
                  <div data-phase={REPLY.length + 4} className="thread-in grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
                    <Metric k="Gross P&L" v={money(m.gross_pnl)} tone={m.gross_pnl} />
                    <Metric k="Net P&L" v={money(m.net_pnl)} tone={m.net_pnl} />
                    <Metric k="Start" v={plain(m.starting_equity)} />
                    <Metric k="Final" v={plain(m.ending_equity)} tone={m.ending_equity - m.starting_equity} />
                    <Metric k="Longest DD" v={`${m.max_dd_days}d`} />
                    <Metric k="Max gain" v={pct(m.max_gain)} tone={m.max_gain} />
                    <Metric k="Max loss" v={pct(m.max_loss)} down />
                    <Metric k="Vol" v={m.volatility == null ? "—" : pct(m.volatility)} />
                  </div>
                )}
                {phase > REPLY.length + 4 && (
                  <div data-phase={REPLY.length + 5} className="thread-in grid grid-cols-2 gap-3">
                    <div className="min-w-0 rounded-xl border border-line bg-ink-950/50 px-2 py-3 sm:px-3">
                      <p className="mb-1 text-xs text-mute">Return distribution</p>
                      <DistChart data={dist} label="Days" height={168} />
                    </div>
                    <div className="min-w-0 rounded-xl border border-line bg-ink-950/50 px-2 py-3 sm:px-3">
                      <p className="mb-1 text-xs text-mute">Volatility distribution</p>
                      <DistChart data={volDist} label="Sessions" height={168} />
                    </div>
                  </div>
                )}
                {phase > REPLY.length + 5 && (
                  <div data-phase={REPLY.length + 6} className="thread-in grid gap-px overflow-hidden rounded-xl border border-line bg-line">
                    <Sample title="In sample" m={split.inn} />
                    <Sample title="Out of sample" m={split.out} />
                  </div>
                )}
                {phase > REPLY.length + 6 && (
                  <div data-phase={REPLY.length + 7} className="thread-in rounded-xl border border-line bg-ink-950/50 px-3 py-3">
                    <p className="mb-1 text-xs text-mute">Monte Carlo</p>
                    <MonteCarloChart data={fan} height={200} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Sample({ title, m }: { title: string; m: { cagr: number; sharpe: number | null; sortino: number | null; max_drawdown: number } }) {
  return (
    <div className="bg-ink-950 px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-mute">{title}</p>
      <div className="mt-1.5 grid grid-cols-4 gap-2">
        <Mini k="CAGR" v={pct(m.cagr)} tone={m.cagr} />
        <Mini k="Sharpe" v={num(m.sharpe)} tone={m.sharpe} />
        <Mini k="Sortino" v={num(m.sortino)} tone={m.sortino} />
        <Mini k="Max DD" v={pct(m.max_drawdown)} down />
      </div>
    </div>
  );
}

function Mini({ k, v, tone, down }: { k: string; v: string; tone?: number | null; down?: boolean }) {
  const color = down || (tone != null && tone < 0) ? "text-red-400" : tone != null && tone > 0 ? "text-emerald-400" : "text-text";
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-mute">{k}</p>
      <p className={`mt-0.5 font-mono text-[11px] leading-none ${color}`}>{v}</p>
    </div>
  );
}

function Metric({ k, v, tone, down }: { k: string; v: string; tone?: number | null; down?: boolean }) {
  const color = down || (tone != null && tone < 0) ? "text-red-400" : tone != null && tone > 0 ? "text-emerald-400" : "text-text";
  return (
    <div className="bg-ink-950 px-3 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{k}</p>
      <p className={`mt-1 font-mono text-sm ${color}`}>{v}</p>
    </div>
  );
}

function num(v: number | null) {
  return v == null ? "—" : v.toFixed(2);
}
function pct(v: number) {
  const x = v * 100;
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(2)}%`;
}
function plain(v: number) {
  return Math.round(v).toLocaleString("en-US");
}
function money(v: number) {
  const sign = v > 0 ? "+" : "";
  return `${sign}${Math.round(v).toLocaleString("en-US")}`;
}