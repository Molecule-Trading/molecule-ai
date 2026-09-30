"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, Run } from "@/lib/api";
import { AppChrome } from "@/components/AppChrome";
import { StrategyCard } from "@/components/StrategyCard";
import { strategyTicker, strategyTitle } from "@/lib/format";

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [tab, setTab] = useState<"all" | "deployed">("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    api<{ runs: Run[] }>("/runs")
      .then((r) => setRuns(r.runs))
      .catch(() => setRuns([]));
  }, []);

  const filtered = useMemo(() => {
    return runs.filter((r) => {
      if (tab === "deployed" && r.status !== "COMPLETED") return false;
      if (!q.trim()) return true;
      const blob = `${r.hypothesis} ${strategyTitle(r)} ${strategyTicker(r)}`.toLowerCase();
      return blob.includes(q.toLowerCase());
    });
  }, [runs, tab, q]);

  const running = runs.filter((r) => r.status === "RUNNING" || r.status === "QUEUED").length;
  const deployed = runs.filter((r) => r.status === "COMPLETED").length;

  return (
    <div className="min-h-screen">
      <AppChrome
        right={
          <Link href="/research" className="rounded-full bg-text px-4 py-2 text-sm font-medium text-ink-950">
            + New strategy
          </Link>
        }
      />

      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">Strategies</div>
            <h1 className="mt-1 font-serif text-4xl font-medium tracking-tight">Your strategies</h1>
            <p className="mt-2 text-sm text-mute">{running} running</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("deployed")}
              className="rounded-full border border-line px-4 py-2 text-sm text-mute hover:text-text"
            >
              Portfolio
            </button>
            <Link
              href="/research"
              className="rounded-full bg-text px-4 py-2 text-sm font-medium text-ink-950"
            >
              + New strategy
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
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
              <span className="ml-2 text-mute">{deployed}</span>
            </button>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search strategies"
            className="w-full max-w-xs rounded-full border border-line bg-ink-900 px-4 py-2 text-sm outline-none"
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filtered.map((r) => (
            <StrategyCard key={r.id} run={r} />
          ))}
          <Link
            href="/research"
            className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-line text-sm text-mute hover:border-text hover:text-text"
          >
            <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-line">
              +
            </span>
            Describe a new strategy in chat
          </Link>
        </div>
      </div>
    </div>
  );
}
