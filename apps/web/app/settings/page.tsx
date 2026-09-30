"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { AppChrome } from "@/components/AppChrome";
import {
  Brokerage,
  loadBrokers,
  loadProfile,
  loadSafety,
  saveBrokers,
  saveProfile,
  saveSafety,
  signOutLocal,
  type Profile,
  type Safety,
} from "@/lib/desk";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "brokerages", label: "List your brokerages" },
  { id: "safety", label: "Automation & Safety" },
  { id: "security", label: "Security" },
  { id: "billing", label: "Billing" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-mute">Loading settings…</div>}>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = (params.get("tab") as Tab) || "profile";
  const [tab, setTab] = useState<Tab>(initial);
  const [profile, setProfile] = useState<Profile>({ firstName: "", lastName: "", email: "" });
  const [saved, setSaved] = useState(false);
  const [brokers, setBrokers] = useState<Brokerage[]>([]);
  const [newBroker, setNewBroker] = useState("");
  const [safety, setSafety] = useState<Safety>({
    confirmLive: true,
    killSwitch: false,
    maxNotional: "100000",
  });
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    setProfile(loadProfile());
    setBrokers(loadBrokers());
    setSafety(loadSafety());
    api("/health")
      .then(setHealth)
      .catch((e) => setHealth({ error: String(e) }));
  }, []);

  useEffect(() => {
    const t = params.get("tab") as Tab | null;
    if (t && TABS.some((x) => x.id === t)) setTab(t);
  }, [params]);

  function persistProfile() {
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function addBroker() {
    const name = newBroker.trim();
    if (!name) return;
    const next = [...brokers, { id: String(Date.now()), name, status: "linked" as const }];
    setBrokers(next);
    saveBrokers(next);
    setNewBroker("");
  }

  function removeBroker(id: string) {
    const next = brokers.filter((b) => b.id !== id);
    setBrokers(next);
    saveBrokers(next);
  }

  function persistSafety(next: Safety) {
    setSafety(next);
    saveSafety(next);
  }

  function signOut() {
    signOutLocal();
    setProfile({ firstName: "", lastName: "", email: "" });
    setBrokers([]);
    router.push("/research");
  }

  return (
    <div className="min-h-screen">
      <AppChrome
        right={
          <Link href="/runs" className="text-sm text-mute hover:text-text">
            ← Strategies
          </Link>
        }
      />

      <div className="mx-auto flex max-w-5xl flex-col md:flex-row">
        <aside className="w-full border-b border-line md:w-64 md:border-b-0 md:border-r">
          <div className="px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line font-mono text-xs">
                {(profile.firstName || "M").slice(0, 1).toUpperCase()}
                {(profile.lastName || "").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="text-sm">
                  {profile.firstName || profile.lastName
                    ? `${profile.firstName} ${profile.lastName}`.trim()
                    : "Molecule desk"}
                </div>
                <div className="text-xs text-mute">{profile.email || "No email set"}</div>
              </div>
            </div>
          </div>
          <nav className="px-2 pb-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  router.replace(`/settings?tab=${t.id}`, { scroll: false });
                }}
                className={`mb-1 block w-full rounded-md px-3 py-2 text-left text-sm ${
                  tab === t.id ? "bg-ink-800 text-text" : "text-mute hover:text-text"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="border-t border-line px-2 py-4">
            <button type="button" onClick={signOut} className="px-3 text-sm text-red-400 hover:text-red-300">
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 px-5 py-8">
          {tab === "profile" && (
            <section className="max-w-xl">
              <h1 className="font-serif text-4xl font-medium">Profile</h1>
              <p className="mt-2 text-sm text-mute">Your name and account details.</p>
              <div className="mt-6 rounded-2xl border border-line bg-ink-900 p-5">
                <h2 className="text-sm font-medium">Your details</h2>
                <p className="mt-1 text-xs text-mute">This is how your name appears across Molecule.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-mute">
                    First name
                    <input
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      className="mt-1 w-full rounded-md border border-line bg-ink-950 px-3 py-2 text-sm text-text outline-none"
                    />
                  </label>
                  <label className="text-xs text-mute">
                    Last name
                    <input
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      className="mt-1 w-full rounded-md border border-line bg-ink-950 px-3 py-2 text-sm text-text outline-none"
                    />
                  </label>
                </div>
                <label className="mt-3 block text-xs text-mute">
                  Email
                  <input
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-ink-950 px-3 py-2 text-sm text-text outline-none"
                  />
                </label>
                <p className="mt-1 text-[11px] text-mute">Stored only in this browser.</p>
                <button
                  type="button"
                  onClick={persistProfile}
                  className="mt-4 rounded-md bg-ink-700 px-4 py-2 text-sm text-text"
                >
                  {saved ? "Saved" : "Save"}
                </button>
              </div>
            </section>
          )}

          {tab === "brokerages" && (
            <section className="max-w-xl">
              <h1 className="font-serif text-4xl font-medium">Brokerages</h1>
              <p className="mt-2 text-sm text-mute">
                Link a name so the composer can attach it. This desk does not send credentials.
              </p>
              <div className="mt-6 space-y-2">
                {brokers.length === 0 && (
                  <div className="rounded-2xl border border-line px-4 py-6 text-sm text-mute">No brokerages linked.</div>
                )}
                {brokers.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-2xl border border-line bg-ink-900 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm">{b.name}</div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-mute">{b.status}</div>
                    </div>
                    <button type="button" onClick={() => removeBroker(b.id)} className="text-xs text-mute hover:text-text">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  value={newBroker}
                  onChange={(e) => setNewBroker(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addBroker()}
                  placeholder="Brokerage name"
                  className="flex-1 rounded-md border border-line bg-ink-900 px-3 py-2 text-sm outline-none"
                />
                <button type="button" onClick={addBroker} className="rounded-md bg-text px-4 py-2 text-sm text-ink-950">
                  Link
                </button>
              </div>
            </section>
          )}

          {tab === "safety" && (
            <section className="max-w-xl">
              <h1 className="font-serif text-4xl font-medium">Automation &amp; Safety</h1>
              <p className="mt-2 text-sm text-mute">Guardrails for this browser session.</p>
              <div className="mt-6 space-y-3 rounded-2xl border border-line bg-ink-900 p-5">
                <label className="flex items-center justify-between text-sm">
                  Confirm before live orders
                  <input
                    type="checkbox"
                    checked={safety.confirmLive}
                    onChange={(e) => persistSafety({ ...safety, confirmLive: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between text-sm">
                  Kill switch
                  <input
                    type="checkbox"
                    checked={safety.killSwitch}
                    onChange={(e) => persistSafety({ ...safety, killSwitch: e.target.checked })}
                  />
                </label>
                <label className="block text-sm">
                  Max notional
                  <input
                    value={safety.maxNotional}
                    onChange={(e) => persistSafety({ ...safety, maxNotional: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-ink-950 px-3 py-2 font-mono text-sm outline-none"
                  />
                </label>
              </div>
            </section>
          )}

          {tab === "security" && (
            <section className="max-w-xl">
              <h1 className="font-serif text-4xl font-medium">Security</h1>
              <p className="mt-2 text-sm text-mute">
                This hosted desk stores profile and chats in local storage. API keys never enter the browser.
              </p>
              <div className="mt-6 rounded-2xl border border-line bg-ink-900 p-5 text-sm text-mute">
                Engine {health?.engine_version || "—"} · {health?.mode === "ui-only" ? "UI only" : "API attached"}
              </div>
            </section>
          )}

          {tab === "billing" && (
            <section className="max-w-xl">
              <h1 className="font-serif text-4xl font-medium">Billing</h1>
              <p className="mt-2 text-sm text-mute">The public desk is the research UI. No card is on file here.</p>
              <div className="mt-6 rounded-2xl border border-line bg-ink-900 p-5">
                <div className="text-sm">Plan</div>
                <div className="mt-1 font-serif text-2xl">Research</div>
                <p className="mt-2 text-sm text-mute">Attach your own API origin to run the engine.</p>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
