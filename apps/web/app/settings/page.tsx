"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null);
  useEffect(() => {
    api("/health").then(setHealth).catch((e) => setHealth({ error: String(e) }));
  }, []);

  const rows = health
    ? [
        ["Mode", health.mode || (health.ok ? "api" : "unknown")],
        ["Engine", health.engine_version || "—"],
        ["Grok", health.grok ? health.model || "on" : "off"],
        ["Recorded run", health.recorded_run_id || "—"],
      ]
    : [];

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-medium">Settings</h1>
        <p className="mt-2 text-sm text-mute">
          The hosted site is the research desk. The Python engine stays on the API process. Point{" "}
          <span className="font-mono">NEXT_PUBLIC_API_URL</span> at that origin to run real backtests.
          <span className="font-mono"> MOLECULE_API_ORIGIN</span> proxies from the server instead.
          Keys never go to the browser. Set <span className="font-mono">WEB_ORIGIN</span> on the API
          to this site's URL.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-px border border-line bg-line text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="bg-ink-900 px-3 py-2 text-mute">{k}</dt>
            <dd className="bg-ink-950 px-3 py-2 font-mono">{String(v)}</dd>
          </div>
        ))}
      </dl>
      {health?.note && <p className="text-sm text-mute">{health.note}</p>}
      {health?.error && <p className="text-sm text-red-400">{health.error}</p>}
    </div>
  );
}
