"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, Run } from "@/lib/api";
import { AppChrome } from "@/components/AppChrome";
import { RightRail } from "@/components/RightRail";
import {
  Chat,
  loadBrokers,
  loadChats,
  loadProfile,
  titleFromHypothesis,
  upsertChat,
} from "@/lib/desk";
import { strategyTitle } from "@/lib/format";

const SOURCES = ["Market & news", "Social", "Filings", "Company numbers"];

export default function ResearchPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [conviction, setConviction] = useState(1);
  const [sources, setSources] = useState<string[]>(["Market & news"]);
  const [brokerage, setBrokerage] = useState("");
  const [brokers, setBrokers] = useState<{ id: string; name: string }[]>([]);
  const [mounted, setMounted] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const existing = loadChats();
    setChats(existing);
    const p = loadProfile();
    setName([p.firstName, p.lastName].filter(Boolean).join(" "));
    setBrokers(loadBrokers());
    api<{ runs: Run[] }>("/runs")
      .then((r) => {
        if (existing.length > 0) return;
        const seeded: Chat[] = r.runs.map((run) => ({
          id: `run-${run.id}`,
          title: strategyTitle(run),
          hypothesis: run.hypothesis,
          createdAt: run.started_at || new Date().toISOString(),
          runId: run.id,
          conviction: 1,
          sources: ["Market & news"],
        }));
        seeded.forEach((c) => upsertChat(c));
        setChats(seeded);
      })
      .catch(() => undefined);
  }, []);

  const greeting = useMemo(() => {
    const first = name.trim().split(" ")[0];
    return first ? `Let’s start building, ${first}` : "Let’s start building";
  }, [name]);

  function toggleSource(s: string) {
    setSources((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function newChat() {
    setActiveId(undefined);
    setText("");
    setError(null);
    setConviction(1);
    setRailOpen(false);
  }

  function selectChat(chat: Chat) {
    setActiveId(chat.id);
    setText(chat.hypothesis);
    setConviction(chat.conviction);
    setSources(chat.sources.length ? chat.sources : ["Market & news"]);
    if (chat.brokerage) setBrokerage(chat.brokerage);
    if (chat.runId) {
      router.push(`/runs/${chat.runId}`);
      return;
    }
    setRailOpen(false);
  }

  async function submit() {
    const hypothesis = text.trim();
    if (hypothesis.length < 8) return;
    setBusy(true);
    setError(null);
    const chat: Chat = {
      id:
        activeId ||
        (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}`),
      title: titleFromHypothesis(hypothesis),
      hypothesis,
      createdAt: new Date().toISOString(),
      conviction,
      sources,
      brokerage: brokerage || undefined,
    };
    setChats(upsertChat(chat));
    setActiveId(chat.id);
    try {
      const run = await api<Run>("/research", {
        method: "POST",
        body: JSON.stringify({ hypothesis }),
      });
      setChats(upsertChat({ ...chat, runId: run.id }));
      router.push(`/runs/${run.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Research failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppChrome
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs text-mute md:hidden"
              onClick={() => setRailOpen((v) => !v)}
            >
              {railOpen ? "Close" : "Menu"}
            </button>
            <Link
              href="/runs"
              className="rounded-full border border-line px-3 py-1.5 text-xs text-mute hover:text-text"
            >
              Strategy cards
            </Link>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <div className="flex min-h-full flex-col">
            <div className="px-4 pt-4">
              <div className="mx-auto max-w-2xl rounded-full border border-line px-4 py-2 text-center text-[11px] text-mute">
                One research job at a time. Listed equities and recorded samples only.
              </div>
            </div>
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10">
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
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-mute">
                      Conviction {conviction.toFixed(1)}
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.1}
                        value={conviction}
                        onChange={(e) => setConviction(Number(e.target.value))}
                      />
                    </label>
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
              <div className="mt-6">
                <div className="mb-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
                  Trades on
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SOURCES.map((s) => {
                    const on = sources.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSource(s)}
                        className={`rounded-full border px-3 py-1.5 text-xs ${
                          on ? "border-text bg-ink-800 text-text" : "border-line text-mute hover:text-text"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>

        <div className={`shrink-0 ${railOpen ? "absolute inset-y-12 right-0 z-20 w-72" : "hidden md:block"}`}>
          <RightRail chats={chats} activeId={activeId} onSelect={selectChat} onNew={newChat} />
        </div>
      </div>
    </div>
  );
}
