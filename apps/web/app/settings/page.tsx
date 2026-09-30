"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null);
  useEffect(() => {
    api("/health").then(setHealth).catch((e) => setHealth({ error: String(e) }));
  }, []);
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-medium">Settings</h1>
      <p className="text-sm text-mute">
        The hosted site is the research desk. The Python engine stays on the API process. Point{" "}
        <span className="font-mono">NEXT_PUBLIC_API_URL</span> at that origin to run real backtests.
        <span className="font-mono"> MOLECULE_API_ORIGIN</span> does the same from the server proxy.
        Keys never go to the browser.
      </p>
      <pre className="border border-line bg-ink-900 p-4 text-xs">{JSON.stringify(health, null, 2)}</pre>
      <ul className="list-disc space-y-1 pl-5 text-sm text-mute">
        <li>XAI_API_KEY / XAI_MODEL</li>
        <li>DATABASE_URL / REDIS_URL</li>
        <li>DATA_DIR / DUCKDB_PATH</li>
        <li>NEXT_PUBLIC_API_URL / MOLECULE_API_ORIGIN</li>
      </ul>
    </div>
  );
}
