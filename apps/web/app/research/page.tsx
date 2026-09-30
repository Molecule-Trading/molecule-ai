"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Run } from "@/lib/api";
import { AppChrome } from "@/components/AppChrome";
import { loadBrokers, loadProfile, titleFromHypothesis, upsertChat, type Chat } from "@/lib/desk";

export default function ResearchPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [brokers, setBrokers] = useState<{ id: string; name: string }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const p = loadProfile();
    setName([p.firstName, p.lastName].filter(Boolean).join(" "));
    setBrokers(loadBrokers());
  }, []);

  const greeting = useMemo(() => {
    const first = name.trim().split(" ")[0];
    return first ? `Let’s start building, ${first}` : "Let’s start building";
  }, [name]);

  async function submit() {
    const hypothesis = text.trim();
    if (hypothesis.length < 8) return;
    setBusy(true);
    setError(null);
    const chat: Chat = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}`,
      title: titleFromHypothesis(hypothesis),
      hypothesis,
      createdAt: new Date().toISOString(),
      conviction: 1,
      sources: ["Market & news"],
      brokerage: brokerage || undefined,
    };
    upsertChat(chat);
    try {
      const run = await api<Run>("/research", {
        method: "POST",
        body: JSON.stringify({ hypothesis }),
      });
      upsertChat({ ...chat, runId: run.id });
      router.push(`/runs/${run.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Research failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppChrome />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-8">
          <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-ink-900 font-mono text-xs text-mute">
            {mounted && name ? name.slice(0, 1).toUpperCase() : "M"}
          </div>
          <h1 className="font-serif text-4xl font-medium tracking-tight md:text-5xl">
            {mounted ? greeting : "Let’s start building"}
          </h1>
          <p className="mt-3 text-sm text-mute">Build, backtest, or explore a new trading idea.</p>
          <div className="mt-8 rounded-2xl border border-line bg-ink-900 p-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              rows={3}
              placeholder="When headlines report a disruption to…"
              className="w-full resize-none bg-transparent px-2 py-2 text-sm text-text outline-none placeholder:text-mute"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <select
                value={brokerage}
                onChange={(e) => {
                  if (e.target.value === "__add") {
                    router.push("/settings?tab=brokerages");
                    return;
                  }
                  setBrokerage(e.target.value);
                }}
                className="rounded-full border border-line bg-ink-950 px-3 py-1.5 text-xs text-mute outline-none"
              >
                <option value="">+ Link your brokerage</option>
                {brokers.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
                <option value="__add">Add brokerage…</option>
              </select>
              <div className="flex items-center gap-3">
                <span className="text-xs text-mute">molecule 1.0</span>
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy || text.trim().length < 8}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-text text-ink-950 disabled:opacity-40"
                  aria-label="Run research"
                >
                  {busy ? "…" : "↑"}
                </button>
              </div>
            </div>
            {error && <div className="px-2 pt-2 text-sm text-red-400">{error}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
