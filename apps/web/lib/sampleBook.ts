/** Deterministic desk sample. Metrics are computed from this series, not typed in. */

export type Bar = { t: string; equity: number; drawdown: number };
export type SampleTrade = {
  trade_id: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fill_ts: string;
  reason: string;
};
export type Metrics = {
  total_return: number;
  net_pnl: number;
  sharpe: number | null;
  sortino: number | null;
  max_drawdown: number;
  win_rate: number | null;
  trade_count: number;
  ending_equity: number;
  volatility: number | null;
};
export type Span = "1Y" | "3Y" | "5Y" | "MAX";
export type FanPoint = { t: string; p10: number; p50: number; p90: number; band: [number, number] };

const SESSIONS: Record<Exclude<Span, "MAX">, number> = { "1Y": 252, "3Y": 252 * 3, "5Y": 252 * 5 };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
}

function sessions(count: number) {
  const out: string[] = [];
  const d = new Date(Date.UTC(2020, 9, 1, 16, 0, 0));
  while (out.length < count) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) out.push(d.toISOString().slice(0, 19));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

export function metricsOf(equity: number[], closedPnl: number[]): Metrics {
  const start = equity[0] ?? 100000;
  const end = equity[equity.length - 1] ?? start;
  const rets: number[] = [];
  for (let i = 1; i < equity.length; i++) rets.push(equity[i] / equity[i - 1] - 1);
  const mean = rets.length ? rets.reduce((s, x) => s + x, 0) / rets.length : 0;
  const sd = stdev(rets);
  const down = rets.length ? Math.sqrt(rets.reduce((s, x) => s + Math.min(x, 0) ** 2, 0) / rets.length) : 0;
  let peak = start;
  let mdd = 0;
  for (const e of equity) {
    peak = Math.max(peak, e);
    mdd = Math.min(mdd, e / peak - 1);
  }
  const wins = closedPnl.filter((p) => p > 0).length;
  return {
    total_return: end / start - 1,
    net_pnl: end - start,
    sharpe: sd > 0 ? (mean / sd) * Math.sqrt(252) : null,
    sortino: down > 0 ? (mean / down) * Math.sqrt(252) : null,
    max_drawdown: mdd,
    win_rate: closedPnl.length ? wins / closedPnl.length : null,
    trade_count: closedPnl.length,
    ending_equity: end,
    volatility: sd > 0 ? sd * Math.sqrt(252) : null,
  };
}

type Built = {
  bars: Bar[];
  trades: SampleTrade[];
  closed: { t: string; pnl: number }[];
  rets: number[];
};

function build(seed = 8): Built {
  const rng = mulberry32(seed);
  const n = 1512;
  const days = sessions(n + 1);
  const px = [100];
  for (let i = 0; i < n; i++) px.push(px[px.length - 1] * Math.exp(0.00015 + 0.013 * gauss(rng)));
  const rets = [0];
  for (let i = 1; i < px.length; i++) rets.push(px[i] / px[i - 1] - 1);

  let pos = 0;
  let capital = 100000;
  let entry = capital;
  const bars: Bar[] = [];
  const trades: SampleTrade[] = [];
  const closed: { t: string; pnl: number }[] = [];
  const stratRets: number[] = [];
  let peak = capital;
  let fills = 0;

  for (let i = 40; i < px.length; i++) {
    const ret20 = px[i] / px[i - 20] - 1;
    const w = rets.slice(i - 19, i + 1);
    const vol = stdev(w);
    const hist: number[] = [];
    for (let j = Math.max(40, i - 60); j <= i; j++) hist.push(stdev(rets.slice(j - 19, j + 1)));
    hist.sort((a, b) => a - b);
    const med = hist[Math.floor(hist.length / 2)];
    const want = ret20 > 0 && vol < med ? 1 : 0;
    const fee = want !== pos ? 0.001 : 0;
    if (want !== pos) {
      if (pos === 1 && want === 0) closed.push({ t: days[i], pnl: capital - entry });
      fills += 1;
      const qty = capital / px[i];
      trades.push({
        trade_id: `T${String(fills).padStart(5, "0")}`,
        side: want === 1 ? "BUY" : "SELL",
        quantity: qty,
        price: px[i],
        fill_ts: days[i],
        reason: want === 1 ? "return positive, vol below median" : "gate failed",
      });
      if (want === 1) entry = capital;
      pos = want;
    }
    const r = pos * rets[i] - fee;
    stratRets.push(r);
    capital *= 1 + r;
    peak = Math.max(peak, capital);
    bars.push({ t: days[i], equity: capital, drawdown: capital / peak - 1 });
  }
  return { bars, trades, closed, rets: stratRets };
}

const BOOK = build(8);

export const ASSUMPTIONS = [
  ["Initial capital", "100,000"],
  ["Timeframe", "1D"],
  ["Lookback", "20 sessions"],
  ["Volatility gate", "60-session median"],
  ["Fees", "10 bps on turnover"],
  ["Execution", "market"],
  ["In sample", "70%"],
  ["Out of sample", "30%"],
];

export function windowOf(span: Span) {
  const bars = span === "MAX" ? BOOK.bars : BOOK.bars.slice(-SESSIONS[span]);
  const start = bars[0]?.t ?? "";
  const trades = BOOK.trades.filter((t) => t.fill_ts >= start);
  const closed = BOOK.closed.filter((c) => c.t >= start).map((c) => c.pnl);
  return { bars, trades, metrics: metricsOf(bars.map((b) => b.equity), closed) };
}

export function splitOf(bars: Bar[]) {
  const cut = Math.max(1, Math.floor(bars.length * 0.7));
  const left = bars.slice(0, cut);
  const right = bars.slice(cut);
  const at = left[left.length - 1]?.t ?? bars[0]?.t ?? "";
  const leftClosed = BOOK.closed.filter((c) => c.t <= at && c.t >= (bars[0]?.t ?? "")).map((c) => c.pnl);
  const rightClosed = BOOK.closed.filter((c) => c.t > at).map((c) => c.pnl);
  return {
    at,
    inn: metricsOf(left.map((b) => b.equity), leftClosed),
    out: metricsOf(
      right.length ? right.map((b) => b.equity) : [bars[bars.length - 1]?.equity ?? 0],
      rightClosed,
    ),
  };
}

export function fanOf(bars: Bar[], paths = 48): FanPoint[] {
  const rets: number[] = [];
  for (let i = 1; i < bars.length; i++) rets.push(bars[i].equity / bars[i - 1].equity - 1);
  if (rets.length < 20) return [];
  const rng = mulberry32(99);
  const start = bars[0].equity;
  const block = 5;
  const clouds: number[][] = [];
  for (let p = 0; p < paths; p++) {
    let equity = start;
    const path = [equity];
    while (path.length < bars.length) {
      const j = Math.floor(rng() * Math.max(1, rets.length - block));
      for (let k = 0; k < block && path.length < bars.length; k++) {
        equity *= 1 + rets[Math.min(rets.length - 1, j + k)];
        path.push(equity);
      }
    }
    clouds.push(path);
  }
  return bars.map((b, i) => {
    const col = clouds.map((c) => c[i] ?? c[c.length - 1]).sort((a, c) => a - c);
    const p10 = col[Math.floor(col.length * 0.1)];
    const p50 = col[Math.floor(col.length * 0.5)];
    const p90 = col[Math.floor(col.length * 0.9)];
    return { t: b.t, p10, p50, p90, band: [p10, p90] };
  });
}
