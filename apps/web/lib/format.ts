import type { Run } from "./api";

export function n(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return Number(v).toFixed(2);
}

export function pct(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  const x = Number(v) * 100;
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(1)}%`;
}

export function strategyTitle(run: Run) {
  const name = run.strategy_spec?.name;
  if (typeof name === "string" && name.trim()) {
    return name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  }
  const h = run.hypothesis || "Untitled strategy";
  return h.length > 48 ? h.slice(0, 48).trim() + "…" : h;
}

export function strategyTicker(run: Run) {
  const spec = run.strategy_spec || run.results?.strategy || {};
  const ref = spec.universe?.reference || {};
  const tgt = spec.universe?.target || {};
  const raw = String(spec.symbol || ref.symbol || tgt.ticker || tgt.market_id || tgt.symbol || "").toUpperCase();
  if (!raw) return "STRAT";
  return raw.replace(/USDT$/, "").slice(0, 8);
}

export function shortDate(iso?: string | null) {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return iso.slice(0, 10);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m) - 1]} ${Number(day)}`;
}
