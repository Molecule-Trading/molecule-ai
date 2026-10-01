"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, Run } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { StrategyCard } from "@/components/StrategyCard";
import { loadPaper } from "@/lib/desk";
import { strategyTicker, strategyTitle } from "@/lib/format";

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [paperIds, setPaperIds] = useState<string[]>([]);
  const [tab, setTab] = useState<"all" | "deployed">("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    api<{ runs: Run[] }>("/runs")
      .then((r) => setRuns(r.runs))
      .catch(() => setRuns([]));
    setPaperIds(loadPaper().map((p) => p.runId));
  }, []);

  const filtered = useMemo(() => {
    return runs.filter((r) => {
      if (tab === "deployed" && !paperIds.includes(r.id)) return false;
      if (!q.trim()) return true;
      const blob = `${r.hypothesis} ${strategyTitle(r)} ${strategyTicker(r)}`.toLowerCase();
      return blob.includes(q.toLowerCase());
    });
  }, [runs, tab, q, paperIds]);

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">Strategies</div>
          <h1 className="mt-1 font-serif text-4xl font-medium tracking-tight">Your strategies</h1>
          <p className="mt-2 text-sm text-mute">{runs.length} Simulated</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/portfolio"
            className="rounded-full border border-line bg-ink-900 px-4 py-2 text-sm text-text hover:border-text"
          >
            Portfolio
          </Link>
          <Link href="/research" className="rounded-full bg-text px-4 py-2 text-sm font-medium text-ink-950">
            + New strategy
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`rounded-full px-3 py-1.5 text-sm ${
              tab === "all" ? "bg-ink-800 text-text" : "text-mute hover:text-text"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab("deployed")}
            className={`rounded-full px-3 py-1.5 text-sm ${
              tab === "deployed" ? "bg-ink-800 text-text" : "text-mute hover:text-text"
            }`}
          >
            Deployed
            <span className="ml-2 text-mute">{paperIds.length}</span>
          </button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search strategies"
          className="w-full max-w-xs rounded-full border border-line bg-ink-900 px-4 py-2 text-sm outline-none"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {filtered.map((r) => (
          <StrategyCard key={r.id} run={r} deployed={paperIds.includes(r.id)} />
        ))}
        <Link
          href="/research"
          className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-line text-sm text-mute hover:border-text hover:text-text"
        >
          <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-line">+</span>
          Describe a new strategy in Chat
        </Link>
      </div>
    </PageShell>
  );
}
