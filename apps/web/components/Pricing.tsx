"use client";

import { useEffect, useState } from "react";
import { loadPlan, savePlan, type DeskPlan } from "@/lib/desk";

const PRO_MONTH = 25;
const PRO_YEAR = 250;

function renewsOn(cycle: "monthly" | "yearly") {
  const d = new Date();
  if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function stamp(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

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

const FREE_FEATURES = ["1 strategy in the portfolio"];

const PRO_FEATURES = [
  "Unlimited strategies in the portfolio",
  "Unlimited backtests on historical data",
  "Spot what the market is reacting to and turn it into a strategy",
  "Track the news and the accounts you follow",
  "Trade through the brokerage of your choice",
];

export function Pricing({ onBack, embedded = false }: { onBack?: () => void; embedded?: boolean }) {
  const [plan, setPlan] = useState<DeskPlan["plan"]>("free");
  const [savedCycle, setSavedCycle] = useState<DeskPlan["cycle"]>("monthly");
  const [cycle, setCycle] = useState<DeskPlan["cycle"]>("monthly");
  const [savedRenews, setSavedRenews] = useState<string | undefined>();
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadPlan();
    setPlan(saved.plan);
    setSavedCycle(saved.cycle);
    setCycle(saved.cycle);
    setSavedRenews(saved.renewsAt);
  }, []);

  function commit(next: DeskPlan, message: string) {
    const saved = { ...next, renewsAt: next.plan === "pro" ? renewsOn(next.cycle) : undefined };
    setPlan(saved.plan);
    setSavedCycle(saved.cycle);
    setCycle(saved.cycle);
    setSavedRenews(saved.renewsAt);
    savePlan(saved);
    setNote(message);
  }

  const yearly = cycle === "yearly";
  const proNow = yearly ? PRO_YEAR : PRO_MONTH;
  const unit = yearly ? "/year" : "/month";
  const onThisPro = plan === "pro" && savedCycle === cycle;

  return (
    <div className="mx-auto w-full max-w-3xl pb-8 pt-2">
      {onBack && (
        <button type="button" onClick={onBack} className="text-sm text-mute hover:text-text">
          ‹ Back
        </button>
      )}
      {!embedded && <h1 className="text-center font-serif text-4xl font-medium tracking-tight sm:text-5xl">Pricing</h1>}

      {embedded && (
        <div className="rounded-2xl border border-line bg-ink-900 px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">Current subscription</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-lg">{plan === "pro" ? "Pro" : "Free"}</p>
              <p className="mt-1 text-sm text-mute">
                {plan === "pro" ? (savedCycle === "yearly" ? "$250 / year" : "$25 / month") : "No active subscription."}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">Expiry</p>
              <p className="mt-1 text-sm">{plan === "pro" ? stamp(savedRenews) : "—"}</p>
            </div>
          </div>
        </div>
      )}

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
            Yearly
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
          <div className="text-sm text-mute">Pro</div>
          <h2 className="mt-4 font-serif text-3xl font-medium">Your trading desk</h2>
          <div className="mt-6 flex items-end gap-1">
            <span className="font-serif text-5xl font-medium tracking-tight">{money(proNow)}</span>
            <span className="mb-1.5 text-sm text-mute">{unit}</span>
          </div>
          <button
            type="button"
            disabled={onThisPro}
            onClick={() => commit({ plan: "pro", cycle }, "Pro is saved on this desk. No card is charged.")}
            className="mt-6 w-full rounded-full bg-text px-4 py-2.5 text-sm font-medium text-ink-950 disabled:cursor-default disabled:opacity-70"
          >
            {onThisPro ? "Your current plan" : "Choose Pro"}
          </button>
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
