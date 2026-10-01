"use client";

import { useEffect, useState } from "react";
import { loadPlan, savePlan, type DeskPlan } from "@/lib/desk";

const PRO_MONTH = 29.99;
const PRO_LIST = 39.99;

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 shrink-0 text-text" aria-hidden="true">
      <path
        d="M3.2 8.2 6.4 11.4 12.8 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const FREE_FEATURES = ["1 free deployed strategy (paper or live trading)"];

const PRO_FEATURES = [
  "Unlimited deployed strategies",
  "Unlimited backtests on historical data",
  "Spot what the market is reacting to and turn it into a strategy",
  "Track the news and the accounts you follow",
  "Trade through the brokerage of your choice",
];

export function Pricing({ onBack }: { onBack?: () => void }) {
  const [plan, setPlan] = useState<DeskPlan["plan"]>("free");
  const [savedCycle, setSavedCycle] = useState<DeskPlan["cycle"]>("monthly");
  const [cycle, setCycle] = useState<DeskPlan["cycle"]>("monthly");
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadPlan();
    setPlan(saved.plan);
    setSavedCycle(saved.cycle);
    setCycle(saved.cycle);
  }, []);

  function commit(next: DeskPlan, message: string) {
    setPlan(next.plan);
    setSavedCycle(next.cycle);
    setCycle(next.cycle);
    savePlan(next);
    setNote(message);
  }

  const yearly = cycle === "yearly";
  const proNow = yearly ? PRO_MONTH * 12 * 0.8 : PRO_MONTH;
  const proWas = yearly ? PRO_MONTH * 12 : PRO_LIST;
  const unit = yearly ? "/year" : "/month";
  const onThisPro = plan === "pro" && savedCycle === cycle;

  return (
    <div className="mx-auto w-full max-w-3xl pb-8 pt-2">
      {onBack && (
        <button type="button" onClick={onBack} className="text-sm text-mute hover:text-text">
          ‹ Back
        </button>
      )}
      <h1 className="mt-6 text-center font-serif text-5xl font-medium tracking-tight">Pricing</h1>

      <div className="mt-6 flex justify-center">
        <div className="inline-flex rounded-full border border-line bg-ink-900 p-1">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`rounded-full px-4 py-1.5 text-sm ${
              !yearly ? "bg-text text-ink-950" : "text-mute hover:text-text"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={`rounded-full px-4 py-1.5 text-sm ${
              yearly ? "bg-text text-ink-950" : "text-mute hover:text-text"
            }`}
          >
            Yearly <span className={yearly ? "text-ink-950" : "text-emerald-600"}>20% off</span>
          </button>
        </div>
      </div>

      <div className="mt-8 grid items-stretch gap-4 md:grid-cols-2">
        <article className="flex h-full flex-col rounded-2xl border border-line bg-ink-900 p-6 shadow-sm">
          <div className="text-sm text-mute">Free</div>
          <h2 className="mt-4 font-serif text-3xl font-medium">Try Molecule</h2>
          <div className="mt-6 flex items-end gap-1">
            <span className="font-serif text-5xl font-medium tracking-tight">$0</span>
            <span className="mb-1.5 text-sm text-mute">{unit}</span>
          </div>
          <button
            type="button"
            disabled={plan === "free"}
            onClick={() => commit({ plan: "free", cycle }, "Free plan saved on this desk.")}
            className="mt-6 w-full rounded-full border border-line px-4 py-2.5 text-sm text-mute disabled:cursor-default"
          >
            {plan === "free" ? "Your current plan" : "Choose Free"}
          </button>
          <div className="mt-8 text-sm font-medium">Start with the basics:</div>
          <ul className="mt-3 space-y-3 text-sm text-mute">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="flex h-full flex-col rounded-2xl border border-line bg-ink-900 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-mute">Pro</div>
            <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-mute">
              Limited time
            </span>
          </div>
          <h2 className="mt-4 font-serif text-3xl font-medium">Your Trading Desk</h2>
          <p className="mt-3 text-sm text-mute">3-day free trial, cancel any time</p>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <span className="mb-1 text-lg text-mute line-through">{money(proWas)}</span>
            <span className="font-serif text-5xl font-medium tracking-tight">{money(proNow)}</span>
            <span className="mb-1.5 text-sm text-mute">{unit}</span>
          </div>
          <button
            type="button"
            disabled={onThisPro}
            onClick={() =>
              commit(
                { plan: "pro", cycle },
                "Pro is saved on this desk. No card is charged.",
              )
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-text px-4 py-2.5 text-sm font-medium text-ink-950 disabled:cursor-default disabled:opacity-70"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9zM12 10v10M4 10l2.2-4.2A1 1 0 0 1 7.1 5h9.8a1 1 0 0 1 .9.8L20 10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            {onThisPro ? "Your current plan" : plan === "pro" ? "Switch billing" : "Claim offer"}
          </button>
          <form
            className="mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              const value = code.trim().toUpperCase();
              if (!value) return;
              if (value === "MOLECULE") {
                setCode("");
                commit({ plan: "pro", cycle }, "Code applied. Pro is saved on this desk.");
              } else {
                setNote("Code not recognized.");
              }
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Have a code?"
              className="w-full rounded-xl border border-line bg-ink-950 px-3 py-2.5 text-center text-sm outline-none placeholder:text-mute"
            />
          </form>
          <ul className="mt-6 space-y-3 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <p className="mt-6 text-center text-xs text-mute">
        {note || "Saved on this desk. No card is charged."}
      </p>
    </div>
  );
}
