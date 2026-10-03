"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, Run } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { addToBook, hideStrategy, loadBook, loadDeskRuns, loadHidden, removeFromBook } from "@/lib/desk";
import { shortDate, strategyTicker, strategyTitle } from "@/lib/format";

function curve(seed: number, ret: number) {
  const n = 70;
  let q = Math.abs(seed) % 2147483646 || 11;
  const rnd = () => (q = (q * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 20; i++) rnd();
  let w = 0;
  const W = [0];
  for (let i = 1; i <= n; i++) {
    w += rnd() + rnd() + rnd() - 1.5;
    W.push(w);
  }
  const L = Math.log(1 + ret / 100);
  const sc = Math.min(0.2, Math.abs(L) * 0.16 + 0.07);
  return W.map((v, i) => Math.exp((L * i) / n + (v - W[n] * (i / n)) * sc));
}

function Spark({ ret, seed }: { ret: number; seed: number }) {
  const c = curve(seed, ret);
  const lo = Math.min(...c);
  const hi = Math.max(...c);
  const X = (i: number) => (i / (c.length - 1)) * 200;
  const Y = (v: number) => 52 - ((v - lo) / (hi - lo || 1)) * 48;
  const d = c.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
  const col = ret >= 0 ? "#3ddc97" : "#ff5d5d";
  const id = `g${seed}`;
  return (
    <svg viewBox="0 0 200 56" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={col} stopOpacity="0.22" />
          <stop offset="1" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="f" d={`${d}L200 56L0 56Z`} fill={`url(#${id})`} />
      <path className="l" pathLength={1} d={d} stroke={col} />
    </svg>
  );
}

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [bookIds, setBookIds] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [tab, setTab] = useState<"all" | "pf">("all");
  const [q, setQ] = useState("");
  const [ask, setAsk] = useState<string | null>(null);

  useEffect(() => {
    api<{ runs: Run[] }>("/runs")
      .then((r) => {
        const remote = Array.isArray(r.runs) ? r.runs : [];
        const seen = new Set(remote.map((item) => item.id));
        setRuns([...loadDeskRuns().filter((item) => !seen.has(item.id)), ...remote]);
      })
      .catch(() => setRuns(loadDeskRuns()));
    setBookIds(loadBook().map((p) => p.runId));
    setHidden(loadHidden());
  }, []);

  const visible = runs.filter((r) => !hidden.includes(r.id));
  const filtered = useMemo(() => {
    return visible.filter((r) => {
      if (tab === "pf" && !bookIds.includes(r.id)) return false;
      if (!q.trim()) return true;
      return `${r.hypothesis} ${strategyTitle(r)} ${strategyTicker(r)}`.toLowerCase().includes(q.toLowerCase());
    });
  }, [visible, tab, q, bookIds]);

  function toggleBook(run: Run) {
    if (bookIds.includes(run.id)) setBookIds(removeFromBook(run.id).map((p) => p.runId));
    else {
      setBookIds(
        addToBook({
          runId: run.id,
          title: strategyTitle(run),
          ticker: strategyTicker(run),
          hypothesis: run.hypothesis,
        }).map((p) => p.runId),
      );
    }
  }

  return (
    <PageShell>
      <div className="desk-strats">
        <header className="head">
          <div>
            <div className="eyebrow">Strategies</div>
            <h1>Your strategies</h1>
            <p className="sub">
              <b>{visible.length}</b> Simulated
            </p>
          </div>
          <div className="btns">
            <Link href="/portfolio" className="btn">
              Portfolio
            </Link>
            <Link href="/research" className="btn p">
              + New strategy
            </Link>
          </div>
        </header>
        <div className="bar">
          <div className="tabs" role="tablist">
            <button type="button" className={`tab ${tab === "all" ? "on" : ""}`} onClick={() => setTab("all")}>
              All
            </button>
            <button type="button" className={`tab ${tab === "pf" ? "on" : ""}`} onClick={() => setTab("pf")}>
              In portfolio<i>{bookIds.length}</i>
            </button>
          </div>
          <label className="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search strategies" />
          </label>
        </div>
        <section className="grid">
          {filtered.map((run, i) => {
            const a = run.results?.analytics;
            const ret = typeof a?.total_return === "number" ? a.total_return * 100 : 0;
            const sharpe = typeof a?.sharpe === "number" ? a.sharpe : null;
            const dd = typeof a?.max_drawdown === "number" ? a.max_drawdown * 100 : null;
            const inP = bookIds.includes(run.id);
            const seed = run.id.split("").reduce((n, ch) => n + ch.charCodeAt(0), 11);
            return (
              <article key={run.id} className={`card ${inP ? "pf" : ""}`} style={{ ["--i" as string]: i }}>
                <Link href={`/runs/${run.id}`} className="in">
                  <div className="meta">
                    <span>{shortDate(run.started_at).toUpperCase()}</span>
                  </div>
                  <h3>{strategyTitle(run)}</h3>
                  <p className="d">{run.hypothesis}</p>
                  <div className="hero">
                    <div className="ret">
                      <small>Return</small>
                      <b className={ret >= 0 ? "pos" : "neg"}>{`${ret >= 0 ? "+" : "\u2212"}${Math.abs(ret).toFixed(1)}%`}</b>
                    </div>
                    <div className="spark">
                      <Spark ret={ret} seed={seed} />
                    </div>
                  </div>
                  <div className="mets">
                    <div className="m">
                      <small>Sharpe</small>
                      <b className={sharpe != null && sharpe < 0 ? "neg" : ""}>{sharpe == null ? "\u2014" : `${sharpe < 0 ? "\u2212" : ""}${Math.abs(sharpe).toFixed(2)}`}</b>
                    </div>
                    <div className="m">
                      <small>Max DD</small>
                      <b className="neg">{dd == null ? "\u2014" : `${dd < 0 ? "\u2212" : ""}${Math.abs(dd).toFixed(1)}%`}</b>
                    </div>
                    <div className="m">
                      <small>Trades</small>
                      <b>{a?.trade_count ?? "\u2014"}</b>
                    </div>
                  </div>
                </Link>
                <div className="foot">
                  <span className="chip">
                    <i />
                    {inP ? "In portfolio" : "Backtested"}
                  </span>
                  <div className="act">
                    <button type="button" className="lnk add" onClick={() => toggleBook(run)}>
                      {inP ? (
                        <>
                          <span className="hidden sm:inline">Remove from portfolio</span>
                          <span className="sm:hidden">Remove</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Add to portfolio</span>
                          <span className="sm:hidden">Add</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`lnk del ${ask === run.id ? "ask" : ""}`}
                      onClick={() => {
                        if (ask !== run.id) {
                          setAsk(run.id);
                          window.setTimeout(() => setAsk((cur) => (cur === run.id ? null : cur)), 2600);
                          return;
                        }
                        setHidden(hideStrategy(run.id));
                        setBookIds(loadBook().map((p) => p.runId));
                      }}
                    >
                      {ask === run.id ? "Confirm delete" : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {tab === "all" && !q && (
            <Link href="/research" className="new" style={{ ["--i" as string]: filtered.length }}>
              <span>+</span>
              Describe a new strategy in Chat
            </Link>
          )}
          {!filtered.length && (tab !== "all" || q) && <div className="none">No strategies match.</div>}
        </section>
      </div>
    </PageShell>
  );
}
