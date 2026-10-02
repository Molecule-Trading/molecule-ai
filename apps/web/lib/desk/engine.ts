/** Daily desk simulator. Same rules as engine/desk/simulate.py and report.py. */

export type DeskBar = { t: string; o: number; h: number; l: number; c: number };

export type DeskRule = { kind: string; window?: number; threshold?: number | null };

export type DeskSpec = {
  name?: string;
  asset_class?: "stock" | "crypto" | "forex";
  symbol: string;
  start?: string | null;
  end?: string | null;
  direction?: "long" | "short" | "both";
  entry: DeskRule[];
  entry_short?: DeskRule[];
  exit_rules?: DeskRule[];
  stop_loss?: number | null;
  take_profit?: number | null;
  trailing_stop?: number | null;
  max_hold_bars?: number | null;
  exit_mode?: "reverse" | "bracket" | "signal";
  events?: { date: string; bias: number; note?: string }[];
  notes?: string;
  untested?: string[];
};

export type TapeFill = { side: "BUY" | "SELL"; price: number; reason: string; qty: number };

export type TapeDay = {
  t: string;
  asset: number;
  gross: number;
  pos: number;
  turn: number;
  px: number;
  opened: boolean;
  closed: boolean;
  reason: string;
  fills: TapeFill[];
};

export type DeskTrade = {
  trade_id: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fill_ts: string;
  reason: string;
};

export type DeskPoint = { t: string; equity: number; drawdown: number; bench: number; grossEquity: number };

export type DeskMetrics = {
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
  open_marked: boolean;
};

export type Replay = {
  bars: DeskPoint[];
  trades: DeskTrade[];
  closed: { t: string; pnl: number }[];
  rets: number[];
  vols: number[];
  metrics: DeskMetrics;
};

const INITIAL = 100000;

function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

function rsi(closes: number[], n: number) {
  const out: (number | null)[] = Array(closes.length).fill(null);
  if (n < 2 || closes.length <= n) return out;
  let avgG = 0;
  let avgL = 0;
  for (let i = 1; i <= n; i++) {
    const d = closes[i] - closes[i - 1];
    avgG += Math.max(d, 0);
    avgL += Math.max(-d, 0);
  }
  avgG /= n;
  avgL /= n;
  const level = (g: number, l: number) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  out[n] = level(avgG, avgL);
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (n - 1) + Math.max(d, 0)) / n;
    avgL = (avgL * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = level(avgG, avgL);
  }
  return out;
}

function daysBetween(a: string, b: string) {
  const da = Date.parse(`${a.slice(0, 10)}T00:00:00Z`);
  const db = Date.parse(`${b.slice(0, 10)}T00:00:00Z`);
  return Math.round((db - da) / 86400000);
}

function clean(bars: DeskBar[]): DeskBar[] {
  const dedup = new Map<string, DeskBar>();
  for (const b of [...bars].sort((a, c) => (a.t < c.t ? -1 : a.t > c.t ? 1 : 0))) {
    const { o, c } = b;
    let { h, l } = b;
    if (Math.min(o, h, l, c) <= 0 || ![o, h, l, c].every(Number.isFinite)) continue;
    h = Math.max(h, o, c);
    l = Math.min(l, o, c);
    dedup.set(b.t.slice(0, 10), { t: b.t.slice(0, 10), o, h, l, c });
  }
  return [...dedup.keys()].sort().map((k) => dedup.get(k)!);
}

type Pack = Record<number, {
  sma: (number | null)[];
  ret: (number | null)[];
  vol: (number | null)[];
  med: (number | null)[];
  hi: (number | null)[];
  lo: (number | null)[];
  rsi: (number | null)[];
}>;

function prep(bars: DeskBar[], windows: number[]): Pack {
  const closes = bars.map((b) => b.c);
  const rets = [0];
  for (let i = 1; i < bars.length; i++) rets.push(closes[i - 1] ? closes[i] / closes[i - 1] - 1 : 0);
  const pack: Pack = {};
  for (const w0 of [...new Set(windows.map((x) => Math.max(1, x)))].sort((a, b) => a - b)) {
    const w = w0;
    const sma: (number | null)[] = Array(bars.length).fill(null);
    const ret: (number | null)[] = Array(bars.length).fill(null);
    const vol: (number | null)[] = Array(bars.length).fill(null);
    const med: (number | null)[] = Array(bars.length).fill(null);
    const hi: (number | null)[] = Array(bars.length).fill(null);
    const lo: (number | null)[] = Array(bars.length).fill(null);
    const vols: number[] = [];
    for (let i = 0; i < bars.length; i++) {
      if (i + 1 >= w) sma[i] = closes.slice(i - w + 1, i + 1).reduce((s, x) => s + x, 0) / w;
      if (i >= w && closes[i - w]) ret[i] = closes[i] / closes[i - w] - 1;
      if (i >= w) {
        vol[i] = stdev(rets.slice(i - w + 1, i + 1));
        vols.push(vol[i] || 0);
        const window = vols.slice(-w);
        const ordered = [...window].sort((a, b) => a - b);
        med[i] = ordered[Math.floor(ordered.length / 2)];
        hi[i] = Math.max(...bars.slice(i - w, i).map((b) => b.h));
        lo[i] = Math.min(...bars.slice(i - w, i).map((b) => b.l));
      }
    }
    pack[w] = { sma, ret, vol, med, hi, lo, rsi: rsi(closes, w) };
  }
  return pack;
}

function onRule(rule: DeskRule, i: number, bars: DeskBar[], pack: Pack, events: [string, number][]) {
  if (rule.kind === "always") return true;
  const w = Math.max(1, rule.window || 1);
  const keys = Object.keys(pack).map(Number);
  const slot = pack[w] || pack[Math.max(...keys)];
  if (i >= bars.length) return false;
  const threshold = rule.threshold == null ? null : rule.threshold;
  if (rule.kind === "sma_cross") {
    if (i < 1 || slot.sma[i] == null || slot.sma[i - 1] == null) return false;
    return bars[i].c > (slot.sma[i] as number) && bars[i - 1].c <= (slot.sma[i - 1] as number);
  }
  if (rule.kind === "sma_cross_down") {
    if (i < 1 || slot.sma[i] == null || slot.sma[i - 1] == null) return false;
    return bars[i].c < (slot.sma[i] as number) && bars[i - 1].c >= (slot.sma[i - 1] as number);
  }
  if (rule.kind === "return_gt") return slot.ret[i] != null && (slot.ret[i] as number) > (threshold ?? 0);
  if (rule.kind === "return_lt") return slot.ret[i] != null && (slot.ret[i] as number) < (threshold ?? 0);
  if (rule.kind === "price_above_sma") return slot.sma[i] != null && bars[i].c > (slot.sma[i] as number);
  if (rule.kind === "price_below_sma") return slot.sma[i] != null && bars[i].c < (slot.sma[i] as number);
  if (rule.kind === "vol_below_median") return slot.vol[i] != null && slot.med[i] != null && (slot.vol[i] as number) < (slot.med[i] as number);
  if (rule.kind === "vol_above_median") return slot.vol[i] != null && slot.med[i] != null && (slot.vol[i] as number) > (slot.med[i] as number);
  if (rule.kind === "breakout_high") return slot.hi[i] != null && bars[i].c > (slot.hi[i] as number);
  if (rule.kind === "breakdown_low") return slot.lo[i] != null && bars[i].c < (slot.lo[i] as number);
  if (rule.kind === "rsi_lt") return slot.rsi[i] != null && (slot.rsi[i] as number) < (threshold ?? 30);
  if (rule.kind === "rsi_gt") return slot.rsi[i] != null && (slot.rsi[i] as number) > (threshold ?? 70);
  if (rule.kind === "event_bias") {
    const want = threshold == null || threshold >= 0 ? 1 : -1;
    const day = bars[i].t;
    for (const [date, bias] of events) {
      if (bias !== want || date > day) continue;
      if (daysBetween(date, day) <= w) return true;
    }
    return false;
  }
  return false;
}

function allRules(rules: DeskRule[], i: number, bars: DeskBar[], pack: Pack, events: [string, number][]) {
  return rules.length > 0 && rules.every((r) => onRule(r, i, bars, pack, events));
}

function windowsOf(spec: DeskSpec) {
  const found = [1];
  for (const group of [spec.entry, spec.entry_short || [], spec.exit_rules || []]) {
    for (const rule of group) found.push(Math.max(1, rule.window || 1));
  }
  return found;
}

function bracket(spec: DeskSpec, pos: number, entry: number, peak: number, trough: number, bar: DeskBar): [number, string] | null {
  if (pos > 0) {
    let stop = spec.stop_loss ? entry * (1 - spec.stop_loss) : null;
    if (spec.trailing_stop) {
      const trail = peak * (1 - spec.trailing_stop);
      stop = stop == null ? trail : Math.max(stop, trail);
    }
    const target = spec.take_profit ? entry * (1 + spec.take_profit) : null;
    const hitStop = stop != null && bar.l <= stop;
    const hitTarget = target != null && bar.h >= target;
    if (hitStop && stop != null) return [bar.o < stop ? bar.o : stop, "stop"];
    if (hitTarget && target != null) return [bar.o > target ? bar.o : target, "target"];
    return null;
  }
  let stop = spec.stop_loss ? entry * (1 + spec.stop_loss) : null;
  if (spec.trailing_stop) {
    const trail = trough * (1 + spec.trailing_stop);
    stop = stop == null ? trail : Math.min(stop, trail);
  }
  const target = spec.take_profit ? entry * (1 - spec.take_profit) : null;
  const hitStop = stop != null && bar.h >= stop;
  const hitTarget = target != null && bar.l <= target;
  if (hitStop && stop != null) return [bar.o > stop ? bar.o : stop, "stop"];
  if (hitTarget && target != null) return [bar.o < target ? bar.o : target, "target"];
  return null;
}

export function simulate(input: DeskBar[], spec: DeskSpec, initial = INITIAL): { tape: TapeDay[]; initial: number } {
  const bars = clean(input);
  if (bars.length < 3) throw new Error("Need at least three daily bars");
  const pack = prep(bars, windowsOf(spec));
  const events: [string, number][] = (spec.events || []).map((e) => [e.date.slice(0, 10), e.bias >= 0 ? 1 : -1]);
  const warmup = Math.max(...windowsOf(spec));
  let cash = initial;
  let shares = 0;
  let pos = 0;
  let entryPx = 0;
  let entryI = 0;
  let peak = 0;
  let trough = 0;
  let pending: [string, number, string] | null = null;
  let equityPrev = initial;
  let prevClose = bars[0].c;
  const tape: TapeDay[] = [];
  const direction = spec.direction || "long";
  const exitMode = spec.exit_mode || "reverse";

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    let opened = false;
    let closed = false;
    const fills: TapeFill[] = [];
    let reasonExit = "";
    if (pending && i > 0) {
      const [kind, side, why] = pending;
      if (kind === "enter" && pos === 0 && bar.o > 0) {
        const qty = Math.floor(cash / bar.o);
        if (qty >= 1) {
          if (side > 0) {
            cash -= qty * bar.o;
            shares = qty;
            fills.push({ side: "BUY", price: bar.o, reason: why, qty });
          } else {
            cash += qty * bar.o;
            shares = -qty;
            fills.push({ side: "SELL", price: bar.o, reason: why, qty });
          }
          pos = side;
          entryPx = bar.o;
          entryI = i;
          peak = bar.o;
          trough = bar.o;
          opened = true;
        }
      } else if (kind === "exit" && pos !== 0 && bar.o > 0) {
        reasonExit = why;
        fills.push({ side: pos > 0 ? "SELL" : "BUY", price: bar.o, reason: why, qty: Math.abs(shares) });
        cash += shares * bar.o;
        shares = 0;
        pos = 0;
        closed = true;
      }
      pending = null;
    }
    if (pos !== 0) {
      const stopped = bracket(spec, pos, entryPx, peak, trough, bar);
      if (stopped) {
        const [px, why] = stopped;
        fills.push({ side: pos > 0 ? "SELL" : "BUY", price: px, reason: why, qty: Math.abs(shares) });
        cash += shares * px;
        shares = 0;
        pos = 0;
        closed = true;
        reasonExit = why;
      } else {
        peak = Math.max(peak, bar.h);
        trough = Math.min(trough, bar.l);
        if (spec.max_hold_bars && i - entryI + 1 >= spec.max_hold_bars) pending = ["exit", 0, "time"];
      }
    }
    const equity = cash + shares * bar.c;
    const gross = equityPrev ? equity / equityPrev - 1 : 0;
    const asset = prevClose ? bar.c / prevClose - 1 : 0;
    tape.push({
      t: bar.t.slice(0, 10),
      asset,
      gross,
      pos,
      turn: fills.length,
      px: fills.length ? fills[fills.length - 1].price : bar.c,
      opened,
      closed,
      reason: reasonExit || (fills[0]?.reason ?? ""),
      fills,
    });
    equityPrev = equity;
    prevClose = bar.c;
    if (i < warmup || pending) continue;
    const longOn = (direction === "long" || direction === "both") && allRules(spec.entry, i, bars, pack, events);
    const shortRules = spec.entry_short?.length ? spec.entry_short : spec.entry;
    const shortOn =
      (direction === "short" || direction === "both") &&
      Boolean(spec.entry_short?.length || direction === "short") &&
      allRules(shortRules, i, bars, pack, events);
    let longSig = longOn;
    let shortSig = shortOn;
    if (direction === "both" && longSig && shortSig) {
      longSig = false;
      shortSig = false;
    }
    if (pos === 0) {
      if (longSig) pending = ["enter", 1, "entry"];
      else if (shortSig && direction !== "long") pending = ["enter", -1, "entry"];
    } else if (exitMode === "signal" && allRules(spec.exit_rules || [], i, bars, pack, events)) {
      pending = ["exit", 0, "signal"];
    } else if (exitMode === "reverse") {
      if (pos > 0 && !longSig) pending = ["exit", 0, "signal"];
      else if (pos < 0 && !shortSig) pending = ["exit", 0, "signal"];
    }
  }
  return { tape, initial };
}

function metricsOf(equity: number[], closedPnl: number[], grossEnd: number, openMarked: boolean): DeskMetrics {
  const start = equity[0] ?? INITIAL;
  const end = equity[equity.length - 1] ?? start;
  const rets: number[] = [];
  for (let i = 1; i < equity.length; i++) rets.push(equity[i - 1] ? equity[i] / equity[i - 1] - 1 : 0);
  const mean = rets.length ? rets.reduce((s, x) => s + x, 0) / rets.length : 0;
  const sd = stdev(rets);
  const down = rets.length ? Math.sqrt(rets.reduce((s, x) => s + Math.min(x, 0) ** 2, 0) / rets.length) : 0;
  let peak = start;
  let mdd = 0;
  let underwater = 0;
  let maxUnder = 0;
  for (const e of equity) {
    peak = Math.max(peak, e);
    const dd = peak ? e / peak - 1 : 0;
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
    total_return: start ? end / start - 1 : 0,
    cagr,
    gross_pnl: grossEnd - start,
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
    open_marked: openMarked,
  };
}

function anchorDate(first: string) {
  const [y, m, d] = first.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const prev = dt.toISOString().slice(0, 10);
  return prev.slice(0, 4) === String(y) ? prev : first;
}

function pathOf(bars: DeskPoint[], closed: { t: string; pnl: number }[]): { rets: number[]; vols: number[]; metrics: DeskMetrics } {
  const rets: number[] = [];
  for (let i = 1; i < bars.length; i++) rets.push(bars[i - 1].equity ? bars[i].equity / bars[i - 1].equity - 1 : 0);
  const vols: number[] = [];
  for (let i = 20; i <= rets.length; i++) vols.push(stdev(rets.slice(i - 20, i)) * Math.sqrt(252));
  const last = bars[bars.length - 1];
  const first = bars[0];
  const grossEnd = first ? first.equity + (last.grossEquity - first.grossEquity) : INITIAL;
  const openMarked = closed.length > 0 && bars.length > 1 ? false : false;
  return { rets, vols, metrics: metricsOf(bars.map((b) => b.equity), closed.map((c) => c.pnl), grossEnd, openMarked) };
}

export function replay(tape: TapeDay[], feePct = 0.1, slipPct = 0.05): Replay {
  const cost = Math.max(0, feePct + slipPct) / 100;
  let capital = INITIAL;
  let grossEq = INITIAL;
  let bench = INITIAL;
  let peak = INITIAL;
  let entry = capital;
  let inPos = false;
  const closed: { t: string; pnl: number }[] = [];
  const trades: DeskTrade[] = [];
  let n = 0;
  const first = tape[0]?.t || "1970-01-01";
  const bars: DeskPoint[] = [{ t: anchorDate(first), equity: INITIAL, drawdown: 0, bench: INITIAL, grossEquity: INITIAL }];
  for (const day of tape) {
    if (day.opened) {
      entry = capital;
      inPos = true;
    }
    const turn = day.turn || 0;
    capital *= 1 + day.gross - turn * cost;
    grossEq *= 1 + day.gross;
    bench *= 1 + (day.asset || 0);
    if (day.closed) {
      closed.push({ t: day.t, pnl: capital - entry });
      inPos = false;
    }
    for (const fill of day.fills || []) {
      n += 1;
      trades.push({
        trade_id: `T${String(n).padStart(5, "0")}`,
        side: fill.side,
        quantity: fill.qty,
        price: fill.price,
        fill_ts: day.t,
        reason: fill.reason,
      });
    }
    peak = Math.max(peak, capital);
    bars.push({ t: day.t, equity: capital, drawdown: peak ? capital / peak - 1 : 0, bench, grossEquity: grossEq });
  }
  if (inPos && tape.length) closed.push({ t: tape[tape.length - 1].t, pnl: capital - entry });
  const openMarked = Boolean(tape.length) && tape[tape.length - 1].pos !== 0;
  const rets: number[] = [];
  for (let i = 1; i < bars.length; i++) rets.push(bars[i - 1].equity ? bars[i].equity / bars[i - 1].equity - 1 : 0);
  const vols: number[] = [];
  for (let i = 20; i <= rets.length; i++) vols.push(stdev(rets.slice(i - 20, i)) * Math.sqrt(252));
  return {
    bars,
    trades,
    closed,
    rets,
    vols,
    metrics: metricsOf(bars.map((b) => b.equity), closed.map((c) => c.pnl), grossEq, openMarked),
  };
}

export function sliceReplay(full: Replay, from?: string | null, to?: string | null): Replay {
  if (!from && !to) return full;
  const lo = from || full.bars[0]?.t || "";
  const hi = to || full.bars[full.bars.length - 1]?.t || "";
  const start = full.bars.findIndex((b) => b.t >= lo);
  let end = -1;
  for (let i = full.bars.length - 1; i >= 0; i--) if (full.bars[i].t <= hi) { end = i; break; }
  if (start < 0 || end < start) return { ...full, bars: [], trades: [], closed: [], rets: [], vols: [] };
  const prev = Math.max(0, start - 1);
  const bars = full.bars.slice(prev === start ? start : prev, end + 1);
  const trades = full.trades.filter((t) => t.fill_ts >= lo && t.fill_ts <= hi);
  const closed = full.closed.filter((c) => c.t >= lo && c.t <= hi);
  const path = pathOf(bars, closed);
  path.metrics.open_marked = full.metrics.open_marked && hi >= (full.bars[full.bars.length - 1]?.t || "");
  return { bars, trades, closed, ...path };
}

export function splitReplay(bars: DeskPoint[], closed: { t: string; pnl: number }[]) {
  const cut = Math.max(1, Math.floor(bars.length * 0.7));
  const left = bars.slice(0, cut);
  const right = bars.slice(Math.max(0, cut - 1));
  const at = left[left.length - 1]?.t ?? "";
  const start = bars[0]?.t ?? "";
  const end = bars[bars.length - 1]?.t ?? "";
  const leftClosed = closed.filter((c) => c.t <= at && c.t >= start);
  const rightClosed = closed.filter((c) => c.t > at && c.t <= end);
  return { at, inn: pathOf(left, leftClosed).metrics, out: pathOf(right, rightClosed).metrics };
}
