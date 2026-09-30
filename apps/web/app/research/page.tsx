"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Run } from "@/lib/api";

const EXAMPLE =
  "Test whether a 1% BTC move over 5 minutes predicts a delayed move in BTC-related prediction markets.";

export default function ResearchPage() {
  const router = useRouter();
  const [text, setText] = useState(EXAMPLE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Run[]>([]);

  const [mode, setMode] = useState<string | null>(null);

  useEffect(() => {
    api<{ runs: Run[] }>("/runs")
      .then((r) => setRecent(r.runs.slice(0, 6)))
      .catch(() => setRecent([]));
    api<{ mode?: string }>("/health")
      .then((h) => setMode(h.mode || "api"))
      .catch(() => setMode(null));
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const run = await api<Run>("/research", {
        method: "POST",
        body: JSON.stringify({ hypothesis: text }),
      });
      router.push(`/runs/${run.id}`);
    } catch (e: any) {
      setError(e.message || "Research failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-mute">Research</div>
        <h1 className="mt-2 text-2xl font-medium">What do you want to research?</h1>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          State a testable hypothesis. Grok drafts a structured strategy. The Python engine
          backtests it. Numbers never come from the model.
        </p>
        {mode === "ui-only" && (
          <p className="mt-3 max-w-2xl text-xs text-mute">
            No API is attached. The example opens a recorded synthetic fixture from the engine.
            A different hypothesis is blocked. This desk will not invent P&L.
          </p>
        )}
      </div>

      <div className="border border-line bg-ink-900 p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full resize-y bg-ink-950 p-3 font-mono text-sm text-text outline-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-mute">Binance · Kalshi · Polymarket</span>
          <button
            onClick={submit}
            disabled={busy || text.trim().length < 8}
            className="bg-text px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-40"
          >
            {busy ? "Running…" : "Run Research"}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      </div>

      <section>
        <h2 className="mb-3 text-sm uppercase tracking-wider text-mute">Recent runs</h2>
        <div className="divide-y divide-line border border-line">
          {recent.length === 0 && <div className="px-4 py-6 text-sm text-mute">No runs yet.</div>}
          {recent.map((r) => (
            <a key={r.id} href={`/runs/${r.id}`} className="block px-4 py-3 hover:bg-ink-800">
              <div className="flex items-center justify-between gap-4">
                <div className="truncate text-sm">{r.hypothesis}</div>
                <div className="shrink-0 font-mono text-xs text-mute">
                  {r.status} · {r.started_at?.slice(0, 19)}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
