"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Run } from "@/lib/api";

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  useEffect(() => {
    api<{ runs: Run[] }>("/runs").then((r) => setRuns(r.runs)).catch(() => setRuns([]));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-medium">Runs</h1>
      <p className="mt-1 text-sm text-mute">Reproducible research records.</p>
      <div className="mt-6 overflow-x-auto border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-900 font-mono text-xs uppercase text-mute">
            <tr>
              <th className="px-3 py-2">Started</th>
              <th className="px-3 py-2">Hypothesis</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Sharpe</th>
              <th className="px-3 py-2">PnL</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-2 font-mono text-xs">{r.started_at?.slice(0, 19)}</td>
                <td className="px-3 py-2">
                  <Link href={`/runs/${r.id}`} className="hover:underline">
                    {r.hypothesis}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.status}
                  {r.synthetic || r.recorded_fixture ? " · synthetic" : ""}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {fmt(r.results?.analytics?.sharpe)}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {fmt(r.results?.analytics?.net_pnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(4);
}
