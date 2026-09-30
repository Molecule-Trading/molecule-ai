"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function MarketsPage() {
  const [venue, setVenue] = useState<string>("");
  const [q, setQ] = useState("");
  const [markets, setMarkets] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);

  async function load() {
    const params = new URLSearchParams();
    if (venue) params.set("venue", venue);
    if (q) params.set("q", q);
    const m = await api<{ markets: any[] }>(`/markets?${params}`);
    const d = await api<{ datasets: any[] }>(`/datasets${venue ? `?venue=${venue}` : ""}`);
    setMarkets(m.markets);
    setDatasets(d.datasets);
  }

  useEffect(() => {
    load().catch(() => {
      setMarkets([]);
      setDatasets([]);
    });
  }, [venue]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-medium">Markets</h1>
        <p className="mt-1 text-sm text-mute">
          Discover what can actually be researched. Availability comes from the catalog first.
        </p>
      </div>
      <div className="flex gap-2">
        <select
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          className="bg-ink-900 px-3 py-2 text-sm outline-none"
        >
          <option value="">All venues</option>
          <option value="BINANCE">Binance</option>
          <option value="KALSHI">Kalshi</option>
          <option value="POLYMARKET">Polymarket</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Filter"
          className="flex-1 bg-ink-900 px-3 py-2 text-sm outline-none"
        />
        <button onClick={load} className="bg-text px-3 py-2 text-sm text-ink-950">
          Search
        </button>
      </div>

      <section>
        <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-mute">Catalog datasets</h2>
        <div className="overflow-x-auto border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-900 font-mono text-xs text-mute">
              <tr>
                <th className="px-3 py-2">Venue</th>
                <th className="px-3 py-2">Instrument</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Rows</th>
                <th className="px-3 py-2">Quality</th>
                <th className="px-3 py-2">Synthetic</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.dataset_id} className="border-t border-line font-mono text-xs">
                  <td className="px-3 py-2">{d.venue}</td>
                  <td className="px-3 py-2">{d.instrument}</td>
                  <td className="px-3 py-2">{d.period}</td>
                  <td className="px-3 py-2">{d.rows}</td>
                  <td className="px-3 py-2">{d.data_quality?.status}</td>
                  <td className="px-3 py-2">{d.synthetic ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-mute">Market list</h2>
        <div className="divide-y divide-line border border-line">
          {markets.map((m, i) => (
            <div key={i} className="px-4 py-3 text-sm">
              <div className="flex justify-between gap-4">
                <div>
                  <div className="font-mono text-xs text-mute">{m.venue}</div>
                  <div>{m.symbol || m.ticker || m.market_id || m.question || m.title}</div>
                </div>
                <div className="font-mono text-xs text-mute">
                  {m.rows ? `${m.rows} rows` : ""} {m.quality || ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
