"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { loadSession, signIn } from "@/lib/desk";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loadSession()) router.replace("/research");
  }, [router]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const session = signIn(email, password);
    if (!session) {
      setError("That account is not on this desk.");
      return;
    }
    router.push("/research");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-16 md:pt-24">
        <h1 className="font-serif text-4xl font-medium tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-mute">The desk is for signed-in accounts only.</p>
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-line bg-ink-900 p-5">
          <label className="block text-xs text-mute">
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-ink-950 px-3 py-2 text-sm text-text outline-none"
            />
          </label>
          <label className="block text-xs text-mute">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-ink-950 px-3 py-2 text-sm text-text outline-none"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="w-full rounded-full bg-text px-4 py-2.5 text-sm font-medium text-ink-950">
            Sign in
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
