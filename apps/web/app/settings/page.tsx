"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Pricing } from "@/components/Pricing";
import {
  loadProfile,
  loadSafety,
  saveProfile,
  saveSafety,
  signOutLocal,
  type Profile,
  type Safety,
} from "@/lib/desk";

const TABS = [
  { id: "profile", label: "Profile" },
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
  const [safety, setSafety] = useState<Safety>({
    confirmLive: true,
    killSwitch: false,
    maxNotional: "100000",
  });
  const [twoFa, setTwoFa] = useState(false);
  const [resetNote, setResetNote] = useState<string | null>(null);

  useEffect(() => {
    setProfile(loadProfile());
    setSafety(loadSafety());
    setTwoFa(window.localStorage.getItem("molecule.desk.2fa") === "1");
  }, [tab]);

  useEffect(() => {
    const t = params.get("tab");
    if (t === "brokerages" || t === "pricing") {
      setTab("billing");
      return;
    }
    else if (t && TABS.some((x) => x.id === t)) setTab(t as Tab);
    else setTab("profile");
  }, [params]);

  function persistProfile() {
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function signOut() {
    signOutLocal();
    setProfile({ firstName: "", lastName: "", email: "" });
    router.push("/");
  }

  function persistSafety(next: Safety) {
    setSafety(next);
    saveSafety(next);
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-col gap-8 md:flex-row md:gap-10">
        <aside className="w-full shrink-0 md:w-56">
          <div className="pb-4">
            <div className="truncate text-sm">
                {profile.firstName || profile.lastName
                  ? `${profile.firstName} ${profile.lastName}`.trim()
                  : "Molecule desk"}
              </div>
              <div className="truncate text-xs text-mute">{profile.email || "No email set"}</div>
          </div>
          <nav>
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
          <div className="mt-4 border-t border-line pt-4">
            <button type="button" onClick={signOut} className="px-3 text-sm text-red-400 hover:text-red-300">
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {tab === "profile" && (
            <section className="max-w-2xl">
              <h1 className="font-serif text-4xl font-medium">Profile</h1>
              <p className="mt-3 text-sm text-mute">Your name and account details.</p>
              <div className="mt-8 rounded-2xl border border-line bg-ink-900 p-8">
                <h2 className="text-sm font-medium">Your details</h2>
                <p className="mt-2 text-xs text-mute">This is how your name appears across Molecule.</p>
                <div className="mt-8 grid gap-5 md:grid-cols-2">
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
                <label className="mt-6 block text-xs text-mute">
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
                  className="mt-8 rounded-md bg-ink-700 px-4 py-2 text-sm text-text"
                >
                  {saved ? "Saved" : "Save"}
                </button>
              </div>
            </section>
          )}

          {tab === "safety" && (
            <section className="max-w-xl">
              <h1 className="font-serif text-4xl font-medium">Automation & Safety</h1>
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
              <p className="mt-2 text-sm text-mute">Password, two-factor authentication, and sessions.</p>
              <div className="mt-6 rounded-2xl border border-line bg-ink-900">
                <div className="border-b border-line px-5 py-4">
                  <h2 className="text-sm font-medium">Two-factor authentication</h2>
                  <p className="mt-1 text-sm text-mute">
                    Require a 6-digit code from an authenticator app at login.
                  </p>
                </div>
                <div className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !twoFa;
                      setTwoFa(next);
                      window.localStorage.setItem("molecule.desk.2fa", next ? "1" : "0");
                    }}
                    className="rounded-lg bg-text px-4 py-2 text-sm font-medium text-ink-950"
                  >
                    {twoFa ? "2FA enabled" : "Enable 2FA"}
                  </button>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-line bg-ink-900">
                <div className="border-b border-line px-5 py-4">
                  <h2 className="text-sm font-medium">Password</h2>
                  <p className="mt-1 text-sm text-mute">We’ll email you a secure link to set a new password.</p>
                </div>
                <div className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() =>
                      setResetNote(
                        profile.email
                          ? `Reset noted for ${profile.email}. No mail service is attached, so nothing was sent.`
                          : "Add an email on Profile first. Nothing was sent.",
                      )
                    }
                    className="rounded-lg border border-line bg-ink-800 px-4 py-2 text-sm text-text"
                  >
                    Reset password
                  </button>
                  {resetNote && <p className="mt-3 text-xs text-mute">{resetNote}</p>}
                </div>
              </div>
            </section>
          )}

          {tab === "billing" && (
            <section className="max-w-3xl">
              <h1 className="font-serif text-4xl font-medium">Billing</h1>
              <p className="mt-2 text-sm text-mute">Your plan and payment method.</p>
              <div className="mt-8">
                <Pricing embedded />
              </div>
            </section>
          )}
        </main>
      </div>
      </div>
    </PageShell>
  );
}
