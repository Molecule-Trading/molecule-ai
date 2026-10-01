"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Run } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { loadProfile, titleFromHypothesis, upsertChat, type Chat } from "@/lib/desk";

type Attachment = { name: string; size: number };

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  onresult: ((ev: { results?: { 0?: { 0?: { transcript?: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

export default function ResearchPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [mounted, setMounted] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    setMounted(true);
    const p = loadProfile();
    setName([p.firstName, p.lastName].filter(Boolean).join(" "));
  }, []);

  const greeting = useMemo(() => {
    const first = name.trim().split(" ")[0];
    return first ? `Let’s start building, ${first}` : "Let’s start building";
  }, [name]);

  function onFiles(list: FileList | null) {
    if (!list?.length) return;
    const next = Array.from(list).map((f) => ({ name: f.name, size: f.size }));
    setFiles((prev) => [...prev, ...next].slice(0, 6));
    if (fileRef.current) fileRef.current.value = "";
  }

  function dictate() {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Voice input is not available in this browser.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    setError(null);
    rec.onresult = (ev) => {
      const said = ev.results?.[0]?.[0]?.transcript?.trim();
      if (said) setText((prev) => (prev.trim() ? `${prev.trim()} ${said}` : said));
    };
    rec.onerror = () => setError("Voice input stopped.");
    rec.onend = () => setListening(false);
    rec.start();
  }

  async function submit() {
    const hypothesis = text.trim();
    if (hypothesis.length < 8) return;
    setBusy(true);
    setError(null);
    const note = files.length ? `\n\nAttached: ${files.map((f) => f.name).join(", ")}` : "";
    const chat: Chat = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}`,
      title: titleFromHypothesis(hypothesis),
      hypothesis: hypothesis + note,
      createdAt: new Date().toISOString(),
      conviction: 1,
      sources: ["Market & news"],
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
    <PageShell center>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-8">
        <h1 className="font-serif text-4xl font-medium tracking-tight md:text-5xl">
          {mounted ? greeting : "Let’s start building"}
        </h1>
        <p className="mt-3 text-sm text-mute">Build, backtest, or explore a new trading idea.</p>
        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-ink-900">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-[10px] text-mute">M</span>
            <span className="text-xs text-mute">MoleculeAI</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={3}
            placeholder="Describe a trading idea. MoleculeAI builds it, simulates it, and tests it."
            className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-text outline-none placeholder:text-mute"
          />
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1 pb-1">
              {files.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}
                  className="rounded-full border border-line px-2.5 py-1 text-[11px] text-mute hover:text-text"
                >
                  {f.name} ×
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-ink-950 px-3 text-xs text-mute hover:text-text"
              >
                <Paperclip />
                Attach
              </button>
              <button
                type="button"
                onClick={dictate}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs ${
                  listening
                    ? "border-red-400 text-red-300"
                    : "border-line bg-ink-950 text-mute hover:text-text"
                }`}
                aria-pressed={listening}
              >
                <Mic />
                {listening ? "Listening" : "Voice"}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <div className="flex items-center gap-3">
              <span className="rounded-md border border-line px-2 py-1 text-xs text-mute">molecule 1.0</span>
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
    </PageShell>
  );
}

function Paperclip() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8.5 12.5l6.2-6.2a3 3 0 114.2 4.2l-7.6 7.6a4.5 4.5 0 11-6.4-6.4l7.1-7.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Mic() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 11a6 6 0 0012 0M12 17v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
