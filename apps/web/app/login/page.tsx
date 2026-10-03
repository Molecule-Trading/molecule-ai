"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => {
        if (r.ok) router.replace("/research");
      })
      .catch(() => undefined);
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Invalid email or password.");
        setPassword("");
        return;
      }
      router.push("/research");
    } catch {
      setError("Sign-in failed. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-16 md:pt-24">
        <h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">Sign in</h1>
        <p className="mt-2 text-sm text-mute">The desk is for signed-in accounts only.</p>
        <form onSubmit={submit} autoComplete="off" className="mt-8 space-y-4 rounded-2xl border border-line bg-ink-900 p-5">
          <label className="block text-xs text-mute">
            Email
            <input
              type="email"
              name="desk-account"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              readOnly={!ready}
              onFocus={() => setReady(true)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-ink-950 px-3 py-2 text-sm text-text outline-none"
            />
          </label>
          <label className="block text-xs text-mute">
            Password
            <input
              type="password"
              name="desk-secret"
              autoComplete="new-password"
              readOnly={!ready}
              onFocus={() => setReady(true)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-ink-950 px-3 py-2 text-sm text-text outline-none"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={pending} className="w-full rounded-full bg-text px-4 py-2.5 text-sm font-medium text-ink-950 disabled:opacity-60">
            {pending ? "Checking…" : "Sign in"}
          </button>
        </form>
        <Link href="/" className="mt-6 text-sm text-mute hover:text-text">
          Back to the site
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
