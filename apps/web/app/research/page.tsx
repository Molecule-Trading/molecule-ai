"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Run } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { loadProfile, saveDeskRun, titleFromHypothesis, upsertChat, type Chat } from "@/lib/desk";

type Attachment = { name: string; size: number; text: string };
type SpeechRec = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results?: { 0?: { 0?: { transcript?: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const PROMPTS = [
  ["Moving-average crossover", "Backtest a 50/200-day moving average crossover on SPY from 2015, with costs included."],
  ["Earnings run-up", "Buy NVDA the session before every earnings call over the last three years. What does the return look like?"],
  ["Mean reversion", "Buy after a three-day drop and sell on the first close above the five-day average. Test it on BTC."],
  ["Stress test", "Run a Monte Carlo on my strategy with in-sample and out-of-sample data."],
];
const EXAMPLES = [
  "When headlines report a disruption to…",
  "Buy when the 20-day return is positive and volatility is falling…",
  "Backtest a 50/200-day crossover on SPY since 2015…",
  "Compare my strategy with buy-and-hold, costs included…",
  "Run a Monte Carlo on my crypto strategy…",
];

export default function ResearchPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [listening, setListening] = useState(false);
  const [ph, setPh] = useState(EXAMPLES[0]);
  const [clock, setClock] = useState("0:00");
  const [toast, setToast] = useState(false);
  const [amps, setAmps] = useState<number[]>(() => Array(70).fill(0.08));

  useEffect(() => {
    const p = loadProfile();
    setName([p.firstName, p.lastName].filter(Boolean).join(" "));
  }, []);

  useEffect(() => {
    if (text) return;
    let ei = 0;
    let ci = 0;
    let del = false;
    let timer = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      if (reduce) return;
      const x = EXAMPLES[ei];
      setPh(x.slice(0, ci));
      if (!del) {
        if (ci < x.length) {
          ci += 1;
          timer = window.setTimeout(tick, 40);
        } else {
          del = true;
          timer = window.setTimeout(tick, 2000);
        }
      } else if (ci > 0) {
        ci = Math.max(0, ci - 2);
        timer = window.setTimeout(tick, 16);
      } else {
        del = false;
        ei = (ei + 1) % EXAMPLES.length;
        timer = window.setTimeout(tick, 380);
      }
    };
    timer = window.setTimeout(tick, 400);
    return () => window.clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    if (!listening) return;
    const t0 = performance.now();
    const id = window.setInterval(() => {
      const s = Math.floor((performance.now() - t0) / 1000);
      setClock(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
    }, 250);
    let raf = 0;
    let last = 0;
    const bars = Array(70).fill(0.08);
    const wave = (now: number) => {
      if (now - last > 75) {
        last = now;
        const sec = (now - t0) / 1000;
        const env = 0.35 + 0.65 * Math.abs(Math.sin(sec * 1.9) * Math.sin(sec * 0.7 + 1));
        const talk = Math.sin(sec * 0.9) > -0.3;
        const v = talk ? Math.min(1, 0.12 + env * (0.35 + Math.random() * 0.65)) : 0.06 + Math.random() * 0.05;
        bars.push(v);
        bars.shift();
        setAmps([...bars]);
      }
      raf = requestAnimationFrame(wave);
    };
    raf = requestAnimationFrame(wave);
    return () => {
      window.clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, [listening]);

  const greeting = useMemo(() => {
    const first = name.trim().split(" ")[0];
    return first ? `Let’s start building, ${first}` : "Let’s start building";
  }, [name]);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    const next: Attachment[] = [];
    for (const file of Array.from(list)) next.push({ name: file.name, size: file.size, text: await readFile(file) });
    setFiles((prev) => [...prev, ...next].slice(0, 4));
    if (fileRef.current) fileRef.current.value = "";
  }

  function dictate() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Voice input is not available in this browser.");
      return;
    }
    const rec = new Ctor();
    recRef.current = rec;
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
    if (hypothesis.length < 8 || busy) return;
    setBusy(true);
    setError(null);
    const note = files.length ? `\n\nAttached: ${files.map((f) => f.name).join(", ")}` : "";
    const attachment = files.map((f) => `# ${f.name}\n${f.text}`).join("\n\n").slice(0, 120000);
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
      const run = await api<Run>("/research", { method: "POST", body: JSON.stringify({ hypothesis, attachment: attachment || undefined }) });
      saveDeskRun(run);
      upsertChat({ ...chat, runId: run.id });
      setToast(true);
      router.push(`/runs/${run.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Research failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell center>
      <div className={`desk-research ${listening ? "listening" : ""} ${text ? "has" : ""}`}>
        <div className="dots" aria-hidden />
        <div className="glow" aria-hidden />
        <main>
          <div className="hero">
            <h1 className="up" style={{ ["--i" as string]: 0 }}>{greeting}</h1>
            <p className="sub up" style={{ ["--i" as string]: 1 }}>Build, backtest, or explore a new trading idea.</p>
            <form
              className="box up"
              style={{ ["--i" as string]: 2 }}
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div className="files">
                {files.map((f) => (
                  <span key={f.name} className="file">
                    {f.name}
                    <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}>×</button>
                  </span>
                ))}
              </div>
              <div className="ta">
                <textarea
                  value={text}
                  rows={2}
                  aria-label="Describe a trading idea"
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                />
                {!text && <span className="ph">{ph}</span>}
                <div className="vp" aria-hidden={!listening}>
                  <span className="lb"><i /><b>Listening</b><em>{clock}</em></span>
                  <span className="wf">
                    {amps.map((v, i) => <s key={i} style={{ transform: `scaleY(${v})` }} />)}
                  </span>
                </div>
              </div>
              <div className="row">
                <div className="l">
                  <button type="button" className="pill" onClick={() => fileRef.current?.click()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" /></svg>
                    Attach
                  </button>
                  <input ref={fileRef} type="file" multiple hidden accept=".txt,.md,.csv,.json,.pdf,.tex" onChange={(e) => void onFiles(e.target.files)} />
                </div>
                <div className="r">
                  <span className="model">molecule 1.0</span>
                  <button type="button" className="mic" aria-label={listening ? "Stop voice input" : "Voice input"} aria-pressed={listening} onClick={dictate}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4" /></svg>
                    <span className="eq"><s /><s /><s /><s /></span>
                  </button>
                  <button className="send" type="submit" disabled={busy || text.trim().length < 8} aria-label="Send">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                  </button>
                </div>
              </div>
              {error && <p className="err">{error}</p>}
            </form>
            <div className="chips up" style={{ ["--i" as string]: 3 }}>
              {PROMPTS.map(([label, prompt]) => (
                <button key={label} type="button" className="chip" onClick={() => setText(prompt)}>{label}</button>
              ))}
            </div>
          </div>
        </main>
        <div className={`toast ${toast ? "on" : ""}`}>Sent. The desk is on it.</div>
      </div>
    </PageShell>
  );
}

async function readFile(file: File) {
  const raw = await file.text();
  if (!file.name.toLowerCase().endsWith(".pdf")) return raw.slice(0, 120000);
  const chunks = raw.replace(/[^\t\n\r\x20-\x7e]/g, " ").match(/[A-Za-z][A-Za-z0-9 ,.:;'"()%+\-]{40,}/g) || [];
  const text = chunks.join("\n").slice(0, 120000);
  return text.length > 200 ? text : `[Could not read text out of ${file.name}. Paste the method into the chat.]`;
}
