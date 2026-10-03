/** Deterministic desk sample. Metrics are computed from this series, not typed in. */

export type Bar = { t: string; equity: number; drawdown: number; bench?: number };
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
  cagr: number;
  gross_pnl: number;
  net_pnl: number;
  sharpe: number | null;
  sortino: number | null;
  calmar: number | null;
  max_drawdown: number;
  max_dd_days: number;
  max_gain: number;
  max_loss: number;
  win_rate: number | null;
  trade_count: number;
  starting_equity: number;
  ending_equity: number;
  volatility: number | null;
};
export type Span = "1Y" | "3Y" | "5Y" | "MAX";
export type FanPoint = { t: string; p10: number; p50: number; p90: number; band: [number, number]; paths: number[] };

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
  const d = new Date(Date.UTC(2020, 9, 1));
  while (out.length < count) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

export function metricsOf(equity: number[], closedPnl: number[], grossEnd?: number): Metrics {
  const start = equity[0] ?? 100000;
  const end = equity[equity.length - 1] ?? start;
  const rets: number[] = [];
  for (let i = 1; i < equity.length; i++) rets.push(equity[i] / equity[i - 1] - 1);
  const mean = rets.length ? rets.reduce((s, x) => s + x, 0) / rets.length : 0;
  const sd = stdev(rets);
  const down = rets.length ? Math.sqrt(rets.reduce((s, x) => s + Math.min(x, 0) ** 2, 0) / rets.length) : 0;
  let peak = start;
  let mdd = 0;
  let underwater = 0;
  let maxUnder = 0;
  for (const e of equity) {
    peak = Math.max(peak, e);
    const dd = e / peak - 1;
    mdd = Math.min(mdd, dd);
    if (dd < -0.0001) {
      underwater += 1;
      maxUnder = Math.max(maxUnder, underwater);
    } else underwater = 0;
  }
  const wins = closedPnl.filter((p) => p > 0).length;
  const years = Math.max(rets.length / 252, 1 / 252);
  const cagr = end > 0 && start > 0 ? (end / start) ** (1 / years) - 1 : 0;
  const gains = rets.filter((r) => r > 0);
  const losses = rets.filter((r) => r < 0);
  return {
    total_return: end / start - 1,
    cagr,
    gross_pnl: (grossEnd ?? end) - start,
    net_pnl: end - start,
    sharpe: sd > 0 ? (mean / sd) * Math.sqrt(252) : null,
    sortino: down > 0 ? (mean / down) * Math.sqrt(252) : null,
    calmar: mdd < 0 ? cagr / Math.abs(mdd) : null,
    max_drawdown: mdd,
    max_dd_days: maxUnder,
    max_gain: gains.length ? Math.max(...gains) : 0,
    max_loss: losses.length ? Math.min(...losses) : 0,
    win_rate: closedPnl.length ? wins / closedPnl.length : null,
    trade_count: closedPnl.length,
    starting_equity: start,
    ending_equity: end,
    volatility: sd > 0 ? sd * Math.sqrt(252) : null,
  };
}

type Day = { t: string; asset: number; pos: number; turn: number; px: number };
type Built = {
  bars: Bar[];
  trades: SampleTrade[];
  closed: { t: string; pnl: number }[];
  rets: number[];
  days: Day[];
};

function build(seed = 8, rule: "momentum" | "fade" | "trend" = "momentum"): Built {
  const rng = mulberry32(seed);
  const n = 1512;
  const calendar = sessions(n + 1);
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
  const tape: Day[] = [];
  let peak = capital;
  let fills = 0;

  const start = rule === "trend" ? 60 : 40;
  for (let i = start; i < px.length; i++) {
    const ret20 = px[i] / px[i - 20] - 1;
    const ret60 = i >= 60 ? px[i] / px[i - 60] - 1 : 0;
    const w = rets.slice(i - 19, i + 1);
    const vol = stdev(w);
    const hist: number[] = [];
    for (let j = Math.max(start, i - 60); j <= i; j++) hist.push(stdev(rets.slice(j - 19, j + 1)));
    hist.sort((a, b) => a - b);
    const med = hist[Math.floor(hist.length / 2)];
    const want = rule === "fade" ? (ret20 < 0 && vol < med ? 1 : 0) : rule === "trend" ? (ret60 > 0 ? 1 : 0) : ret20 > 0 && vol < med ? 1 : 0;
    const reason = rule === "fade" ? (want === 1 ? "pullback, vol below median" : "bounce") : rule === "trend" ? (want === 1 ? "sixty-session return positive" : "trend failed") : want === 1 ? "return positive, vol below median" : "gate failed";
    const fee = want !== pos ? 0.001 : 0;
    const turn = want !== pos ? 1 : 0;
    if (want !== pos) {
      if (pos === 1 && want === 0) closed.push({ t: calendar[i], pnl: capital - entry });
      fills += 1;
      const qty = Math.max(1, Math.round(capital / px[i]));
      trades.push({
        trade_id: `T${String(fills).padStart(5, "0")}`,
        side: want === 1 ? "BUY" : "SELL",
        quantity: qty,
        price: px[i],
        fill_ts: calendar[i],
        reason,
      });
      if (want === 1) entry = capital;
      pos = want;
    }
    const r = pos * rets[i] - fee;
    stratRets.push(r);
    tape.push({ t: calendar[i], asset: rets[i], pos, turn, px: px[i] });
    capital *= 1 + r;
    peak = Math.max(peak, capital);
    bars.push({ t: calendar[i], equity: capital, drawdown: capital / peak - 1 });
  }
  return { bars, trades, closed, rets: stratRets, days: tape };
}

export type BookId = "momentum" | "fade" | "trend";

const BOOKS: Record<BookId, Built> = {
  momentum: build(8, "momentum"),
  fade: build(21, "fade"),
  trend: build(44, "trend"),
};
const BOOK = BOOKS.momentum;

export function bookIdOf(runId?: string): BookId {
  if (!runId) return "momentum";
  if (runId.includes("fade")) return "fade";
  if (runId.includes("trend")) return "trend";
  return "momentum";
}

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
  const q = quote(span);
  return { bars: q.bars, trades: q.trades, metrics: q.metrics };
}

export function splitOf(bars: Bar[], book: BookId = "momentum") {
  const closed = BOOKS[book].closed;
  const cut = Math.max(1, Math.floor(bars.length * 0.7));
  const left = bars.slice(0, cut);
  const right = bars.slice(cut);
  const at = left[left.length - 1]?.t ?? bars[0]?.t ?? "";
  const end = bars[bars.length - 1]?.t ?? "";
  const leftClosed = closed.filter((c) => c.t <= at && c.t >= (bars[0]?.t ?? "")).map((c) => c.pnl);
  const rightClosed = closed.filter((c) => c.t > at && c.t <= end).map((c) => c.pnl);
  return {
    at,
    inn: metricsOf(left.map((b) => b.equity), leftClosed),
    out: metricsOf(
      right.length ? right.map((b) => b.equity) : [bars[bars.length - 1]?.equity ?? 0],
      rightClosed,
    ),
  };
}

export function quote(span: Span, feePct = 0.1, slipPct = 0.05, book: BookId = "momentum") {
  const src = BOOKS[book];
  const cost = Math.max(0, feePct + slipPct) / 100;
  const sliced = span === "MAX" ? src.days : src.days.slice(-SESSIONS[span]);
  let capital = 100000;
  let gross = 100000;
  let bench = 100000;
  let peak = capital;
  let entry = capital;
  const bars: Bar[] = [];
  const benchBars: { t: string; bench: number }[] = [];
  const trades: SampleTrade[] = [];
  const closed: { t: string; pnl: number }[] = [];
  const rets: number[] = [];
  const vols: number[] = [];
  let fills = 0;
  sliced.forEach((d, i) => {
    const drag = d.turn ? cost : 0;
    const r = d.pos * d.asset - drag;
    if (d.turn) {
      if (d.pos === 0) closed.push({ t: d.t, pnl: capital - entry });
      fills += 1;
      trades.push({
        trade_id: `T${String(fills).padStart(5, "0")}`,
        side: d.pos === 1 ? "BUY" : "SELL",
        quantity: Math.max(1, Math.round(capital / d.px)),
        price: d.px,
        fill_ts: d.t,
        reason: d.pos === 1 ? "return positive, vol below median" : "gate failed",
      });
      if (d.pos === 1) entry = capital;
    }
    capital *= 1 + r;
    gross *= 1 + d.pos * d.asset;
    bench *= 1 + d.asset;
    peak = Math.max(peak, capital);
    rets.push(r);
    if (i >= 19) vols.push(stdev(rets.slice(i - 19, i + 1)) * Math.sqrt(252));
    bars.push({ t: d.t, equity: capital, drawdown: capital / peak - 1, bench });
    benchBars.push({ t: d.t, bench });
  });
  return {
    bars,
    benchBars,
    trades,
    rets,
    vols,
    closed,
    metrics: metricsOf(bars.map((b) => b.equity), closed.map((c) => c.pnl), gross),
  };
}

export function clip(
  bars: Bar[],
  trades: SampleTrade[],
  closed: { t: string; pnl: number }[],
  from?: string | null,
  to?: string | null,
) {
  const lo = from || bars[0]?.t || "";
  const hi = to || bars[bars.length - 1]?.t || "";
  const next = bars.filter((b) => b.t >= lo && b.t <= hi);
  const fills = trades.filter((t) => t.fill_ts >= lo && t.fill_ts <= hi);
  const done = closed.filter((c) => c.t >= lo && c.t <= hi).map((c) => c.pnl);
  const rets: number[] = [];
  for (let i = 1; i < next.length; i++) rets.push(next[i].equity / next[i - 1].equity - 1);
  const vols: number[] = [];
  for (let i = 20; i <= rets.length; i++) vols.push(stdev(rets.slice(i - 20, i)) * Math.sqrt(252));
  const grossEnd = next.length ? next[0].equity + (next[next.length - 1].equity - next[0].equity) : undefined;
  return { bars: next, trades: fills, rets, vols, metrics: metricsOf(next.map((b) => b.equity), done, grossEnd) };
}

export type YearRow = {
  year: string;
  months: (number | null)[];
  total: number;
  maxDd: number;
  ddDays: number;
  ddFrom: string;
  ddTo: string;
  ratio: number | null;
};

export function yearRows(bars: Bar[]): YearRow[] {
  if (bars.length < 2) return [];
  const years = [...new Set(bars.map((b) => b.t.slice(0, 4)))];
  return years.map((year) => {
    const first = bars.findIndex((b) => b.t.startsWith(year));
    const last = (() => {
      for (let i = bars.length - 1; i >= 0; i--) if (bars[i].t.startsWith(year)) return i;
      return first;
    })();
    const base = Math.max(0, first - 1);
    const slice = bars.slice(base, last + 1);
    const months: (number | null)[] = Array(12).fill(null);
    for (let i = 1; i < slice.length; i++) {
      if (!slice[i].t.startsWith(year)) continue;
      const m = Number(slice[i].t.slice(5, 7)) - 1;
      const d = slice[i].equity - slice[i - 1].equity;
      months[m] = (months[m] || 0) + d;
    }
    let peak = slice[0].equity;
    let peakAt = slice[0].t;
    let maxDd = 0;
    let ddFrom = slice[0].t;
    let ddTo = slice[0].t;
    let ddDays = 0;
    for (let i = 1; i < slice.length; i++) {
      if (slice[i].equity >= peak) {
        peak = slice[i].equity;
        peakAt = slice[i].t;
      }
      const dd = slice[i].equity - peak;
      if (dd < maxDd) {
        maxDd = dd;
        ddFrom = peakAt;
        ddTo = slice[i].t;
        ddDays = i - slice.findIndex((b) => b.t === peakAt);
      }
    }
    const total = months.reduce<number>((s, v) => s + (v || 0), 0);
    return {
      year,
      months,
      total,
      maxDd,
      ddDays,
      ddFrom,
      ddTo,
      ratio: maxDd < 0 ? total / Math.abs(maxDd) : null,
    };
  });
}

export function monthsOf(bars: Bar[]) {
  const cells = new Map<string, number>();
  const byYear = new Map<string, Bar[]>();
  for (let i = 1; i < bars.length; i++) {
    const y = bars[i].t.slice(0, 4);
    const m = Number(bars[i].t.slice(5, 7));
    const key = `${y}-${m}`;
    const r = bars[i].equity / bars[i - 1].equity - 1;
    cells.set(key, (cells.get(key) || 0) + r);
    const list = byYear.get(y) || [];
    list.push(bars[i]);
    byYear.set(y, list);
  }
  const years = [...byYear.keys()].sort();
  return {
    years,
    cell: (y: string, m: number) => cells.get(`${y}-${m}`),
    yearStats: years.map((y) => {
      const slice = byYear.get(y) || [];
      const m = metricsOf(slice.map((b) => b.equity), []);
      return { year: y, dd: m.max_drawdown, sharpe: m.sharpe, days: m.max_dd_days };
    }),
  };
}

export function histOf(values: number[], bins = 24) {
  if (!values.length) return [];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const counts = Array.from({ length: bins }, (_, i) => ({ x: lo + (span * (i + 0.5)) / bins, n: 0 }));
  for (const v of values) {
    const i = Math.min(bins - 1, Math.floor(((v - lo) / span) * bins));
    counts[i].n += 1;
  }
  return counts;
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
  const show = Math.min(16, clouds.length);
  const stride = Math.max(1, Math.floor(clouds.length / show));
  const picked = clouds.filter((_, i) => i % stride === 0).slice(0, show);
  return bars.map((b, i) => {
    const col = clouds.map((c) => c[i] ?? c[c.length - 1]).sort((a, c) => a - c);
    const p10 = col[Math.floor(col.length * 0.1)];
    const p50 = col[Math.floor(col.length * 0.5)];
    const p90 = col[Math.floor(col.length * 0.9)];
    return { t: b.t, p10, p50, p90, band: [p10, p90] as [number, number], paths: picked.map((c) => c[i] ?? c[c.length - 1]) };
  });
}

const SLEEVE_IDS: BookId[] = ["momentum", "fade", "trend"];

export function portfolioWeighted(parts: { book: BookId; weight: number }[]) {
  const live = parts.filter((p) => p.weight > 0);
  if (!live.length) return { bars: [] as Bar[], metrics: null, sleeves: [] as { id: BookId; weight: number; share: number }[] };
  const sum = live.reduce((s, p) => s + p.weight, 0);
  const quoted = live.map((p) => ({ ...p, share: p.weight / sum, q: quote("MAX", 0.1, 0.05, p.book) }));
  const n = Math.min(...quoted.map((s) => s.q.bars.length));
  let equity = 100000;
  let peak = equity;
  const bars: Bar[] = [];
  const prev = quoted.map((s) => s.q.bars[0]?.equity || 100000);
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      let r = 0;
      quoted.forEach((s, k) => {
        const e = s.q.bars[i].equity;
        r += s.share * (e / prev[k] - 1);
        prev[k] = e;
      });
      equity *= 1 + r;
    }
    peak = Math.max(peak, equity);
    bars.push({ t: quoted[0].q.bars[i].t, equity, drawdown: equity / peak - 1 });
  }
  return {
    bars,
    metrics: metricsOf(bars.map((b) => b.equity), []),
    sleeves: quoted.map((s) => ({ id: s.book, weight: s.weight, share: s.share })),
  };
}
