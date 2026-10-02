import { replay, simulate, type DeskBar, type DeskRule, type DeskSpec } from "./engine";

const SYSTEM = `You translate a trading thesis into one daily-bar test. Reply with JSON only, no markdown.
Do not invent returns, Sharpe, or trade counts. You only choose the rule.
Schema:
{
  "name": "short name",
  "asset_class": "stock" | "crypto" | "forex",
  "symbol": "AAPL or BTC/USD or EURUSD",
  "start": "YYYY-MM-DD or null",
  "end": "YYYY-MM-DD or null",
  "direction": "long" | "short" | "both",
  "entry": [{"kind": "...", "window": 20, "threshold": null}],
  "entry_short": [],
  "exit_rules": [],
  "stop_loss": null,
  "take_profit": null,
  "trailing_stop": null,
  "max_hold_bars": null,
  "exit_mode": "reverse" | "bracket" | "signal",
  "events": [{"date": "YYYY-MM-DD", "bias": 1, "note": ""}],
  "notes": "what is being tested",
  "untested": ["parts of the thesis daily prices cannot decide"]
}
Rule kind is one of: always, sma_cross, return_gt, return_lt, price_above_sma, price_below_sma, vol_below_median, vol_above_median, breakout_high, breakdown_low, rsi_lt, rsi_gt, event_bias.
threshold is a return fraction (0.01 = 1%), an RSI level, or 1/-1 for event_bias. stop_loss, take_profit, trailing_stop are fractions (0.02 = 2%).
Use exit_mode reverse when the position should stay open only while the entry rule is true.
A cross or breakout is true for one session only. If the trade should stay open after that cross, use price_above_sma or price_below_sma with exit_mode reverse, or use exit_mode bracket with a stop, target, or trail.
Use bracket when the thesis is an entry plus stop, target, or trailing stop.
Use signal when exit_rules are the exit.
If the thesis cites a speech, release, or earnings date you know, put that exact date in events and add an event_bias entry rule with threshold 1 or -1. If you do not know the date, put the reason in untested and do not invent a date.
One symbol only. Stocks use a ticker. Crypto uses BTC/USD. Forex uses EURUSD.
window is sessions, except event_bias where window is calendar days after the event, including the event date.
Do not put a number you were not given into notes.`;

const ONE_BAR = new Set(["sma_cross", "breakout_high", "breakdown_low"]);

function fraction(name: string, value: unknown, notes: string[]) {
  if (value == null) return null;
  let number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${name} is not a number`);
  if (number === 0) return null;
  if (number < 0) throw new Error(`${name} cannot be negative`);
  if (number > 1) {
    if (number <= 100) {
      notes.push(`${name} ${number} was read as ${number} percent`);
      number = number / 100;
    } else throw new Error(`${name} ${number} is not a usable fraction`);
  }
  if (number >= 1) throw new Error(`${name} must be under 100 percent`);
  return number;
}

export function normalizeSpec(input: DeskSpec): DeskSpec {
  const notes: string[] = [];
  const spec: DeskSpec = {
    ...input,
    entry: (input.entry || []).map((r) => ({ ...r })),
    entry_short: (input.entry_short || []).map((r) => ({ ...r })),
    exit_rules: (input.exit_rules || []).map((r) => ({ ...r })),
    events: (input.events || []).map((e) => ({ ...e })),
    untested: [...(input.untested || [])],
  };
  spec.stop_loss = fraction("stop_loss", spec.stop_loss, notes);
  spec.take_profit = fraction("take_profit", spec.take_profit, notes);
  spec.trailing_stop = fraction("trailing_stop", spec.trailing_stop, notes);
  for (const group of [spec.entry, spec.entry_short || [], spec.exit_rules || []]) {
    for (const rule of group) {
      let window = Math.trunc(Number(rule.window || 1));
      if (window < 1) window = 1;
      if (window > 504) {
        notes.push(`${rule.kind} window capped at 504 sessions`);
        window = 504;
      }
      rule.window = window;
    }
  }
  if (!spec.entry.length) throw new Error("The thesis did not produce an entry rule");
  const oneBar = spec.entry.every((r) => ONE_BAR.has(r.kind));
  const hasRisk = Boolean(spec.stop_loss || spec.take_profit || spec.trailing_stop);
  if (oneBar && hasRisk && (spec.exit_mode || "reverse") === "reverse" && !(spec.exit_rules || []).length) {
    spec.exit_mode = "bracket";
    notes.push("A cross is one session, so the position is held with the stop or target.");
  }
  if ((spec.exit_rules || []).length && (spec.exit_mode || "reverse") === "reverse") spec.exit_mode = "signal";
  if (spec.direction === "both" && !(spec.entry_short || []).length) notes.push("No short entry was given, so only longs are taken.");
  const kept = [];
  for (const ev of spec.events || []) {
    if (/^\d{4}-\d{2}-\d{2}/.test(String(ev.date || ""))) {
      ev.date = String(ev.date).slice(0, 10);
      kept.push(ev);
    } else spec.untested?.push(`Dropped an event with no real date (${ev.note || ev.date})`);
  }
  spec.events = kept;
  if (notes.length) spec.notes = `${spec.notes || ""} ${notes.join(" ")}`.trim();
  if (!spec.symbol?.trim()) throw new Error("The model did not name a symbol");
  return spec;
}

function normalizeSymbol(asset: string, symbol: string) {
  let raw = symbol.trim().toUpperCase().replace(/\s/g, "");
  if (asset === "crypto") {
    raw = raw.replace("-", "/");
    if (!raw.includes("/")) {
      if (raw.endsWith("USDT")) raw = `${raw.slice(0, -4)}/USD`;
      else if (raw.endsWith("USD") && raw.length > 3) raw = `${raw.slice(0, -3)}/USD`;
      else raw = `${raw}/USD`;
    }
    return raw;
  }
  if (asset === "forex") return raw.replace("/", "");
  return raw.replace("/", "");
}

async function alpacaDaily(asset: string, symbol: string, start: string, end: string, key: string, secret: string) {
  const headers = { "APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret };
  const base = "https://data.alpaca.markets";
  const params = new URLSearchParams({ symbols: symbol, timeframe: "1Day", start, end, limit: "10000" });
  let url = "";
  if (asset === "stock") {
    params.set("adjustment", "all");
    params.set("feed", "iex");
    url = `${base}/v2/stocks/bars`;
  } else if (asset === "crypto") url = `${base}/v1beta3/crypto/us/bars`;
  else if (asset === "forex") url = `${base}/v1beta1/forex/bars`;
  else throw new Error(`Unsupported asset class ${asset}`);

  const pages = async (query: URLSearchParams) => {
    const out: DeskBar[] = [];
    let token = "";
    for (let i = 0; i < 20; i++) {
      const q = new URLSearchParams(query);
      if (token) q.set("page_token", token);
      const res = await fetch(`${url}?${q.toString()}`, { headers, cache: "no-store" });
      if (res.status === 403 && q.has("feed")) return [];
      if (!res.ok) throw new Error(`Alpaca ${res.status} for ${symbol}: ${(await res.text()).slice(0, 240)}`);
      const body = await res.json();
      const blob = body.bars || {};
      let rows = blob[symbol] || [];
      if (!rows.length && Object.keys(blob).length === 1) rows = Object.values(blob)[0] || [];
      for (const row of rows as Record<string, number | string>[]) {
        const t = String(row.t || "").slice(0, 10);
        const o = Number(row.o);
        const h = Number(row.h);
        const l = Number(row.l);
        const c = Number(row.c);
        if (![o, h, l, c].every((n) => Number.isFinite(n) && n > 0)) continue;
        out.push({ t, o, h, l, c });
      }
      token = body.next_page_token || "";
      if (!token) break;
    }
    return out;
  };

  let rows = await pages(params);
  if (!rows.length && asset === "stock") {
    params.delete("feed");
    rows = await pages(params);
  }
  if (rows.length < 3) throw new Error(`Alpaca returned ${rows.length} daily bars for ${symbol}`);
  return rows;
}

function assumptions(spec: DeskSpec, bars: DeskBar[], openMarked: boolean) {
  const entry = spec.entry.map((r: DeskRule) => `${r.kind}(${r.window})`).join(", ") || "—";
  const risk = [
    spec.stop_loss ? `stop ${(spec.stop_loss * 100).toFixed(2)}%` : "",
    spec.take_profit ? `target ${(spec.take_profit * 100).toFixed(2)}%` : "",
    spec.trailing_stop ? `trail ${(spec.trailing_stop * 100).toFixed(2)}%` : "",
    spec.max_hold_bars ? `max hold ${spec.max_hold_bars} sessions` : "",
  ].filter(Boolean);
  const rows: string[][] = [
    ["Symbol", spec.symbol],
    ["Class", spec.asset_class || "stock"],
    ["Direction", spec.direction || "long"],
    ["Entry", entry],
    ["Exit", spec.exit_mode || "reverse"],
    ["Risk", risk.join(", ") || "none"],
    ["Sample", `${bars[0].t} → ${bars[bars.length - 1].t}`],
    ["Fill", "signal at close, fill next open; stop before target"],
    ["Costs", "not in the tape; sliders default to 0.10% fee and 0.05% slippage per fill"],
    ["Capital", "100,000"],
    ["Data", "Alpaca daily bars"],
  ];
  if (openMarked) rows.push(["Open trade", "still open, marked to the last close"]);
  if (spec.untested?.length) rows.push(["Not tested", spec.untested.join("; ")]);
  if (spec.notes) rows.push(["Spec", spec.notes]);
  return rows;
}

function failed(hypothesis: string, error: string) {
  return {
    id: crypto.randomUUID(),
    hypothesis,
    status: "FAILED",
    stage: "RUNNING_BACKTEST",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    error,
    synthetic: false,
    recorded_fixture: false,
    strategy_spec: null,
    results: null,
    ai_analysis: null,
  };
}

export async function runDesk(hypothesis: string, attachment?: string) {
  const text = hypothesis.trim();
  if (text.length < 8) return failed(text, "Describe the strategy in a bit more detail.");
  const xai = process.env.XAI_API_KEY || "";
  const alpacaKey = process.env.ALPACA_API_KEY_ID || "";
  const alpacaSecret = process.env.ALPACA_API_SECRET_KEY || "";
  if (!xai) return failed(text, "XAI_API_KEY is not set. The model was not asked to invent a result.");
  if (!alpacaKey || !alpacaSecret) {
    return failed(
      text,
      "ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY are not set. No sample curve was substituted.",
    );
  }
  try {
    const user = attachment?.trim() ? `${text}\n\nAttached material:\n${attachment.slice(0, 120000)}` : text;
    const model = process.env.XAI_MODEL || "grok-4";
    const base = (process.env.XAI_API_BASE || "https://api.x.ai/v1").replace(/\/$/, "");
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${xai}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 1800,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`xAI ${res.status}: ${(await res.text()).slice(0, 240)}`);
    const body = await res.json();
    let raw = String(body.choices?.[0]?.message?.content || "").trim();
    if (raw.startsWith("```")) raw = raw.split("\n").slice(1).join("\n").replace(/```$/, "");
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end < start) throw new Error("The model did not return a strategy spec");
    const spec = normalizeSpec(JSON.parse(raw.slice(start, end + 1)) as DeskSpec);
    const endD = spec.end ? new Date(`${spec.end.slice(0, 10)}T00:00:00Z`) : new Date();
    let startD = spec.start ? new Date(`${spec.start.slice(0, 10)}T00:00:00Z`) : new Date(endD.getTime() - 365 * 5 * 86400000);
    if ((endD.getTime() - startD.getTime()) / 86400000 > 365 * 15) {
      startD = new Date(endD.getTime() - 365 * 15 * 86400000);
      spec.notes = `${spec.notes || ""} Window capped at 15 years.`.trim();
    }
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const symbol = normalizeSymbol(spec.asset_class || "stock", spec.symbol);
    spec.symbol = symbol;
    const bars = await alpacaDaily(spec.asset_class || "stock", symbol, iso(startD), iso(endD), alpacaKey, alpacaSecret);
    const tape = simulate(bars, spec).tape;
    const view = replay(tape, 0.1, 0.05);
    const analytics = view.metrics;
    return {
      id: crypto.randomUUID(),
      hypothesis: text,
      status: "COMPLETED",
      stage: "INTERPRETING",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error: null,
      synthetic: false,
      recorded_fixture: false,
      engine_version: "desk-daily-1",
      data_sources: [`alpaca:${symbol}`],
      data_period: `${tape[0].t}/${tape[tape.length - 1].t}`,
      strategy_spec: {
        ...spec,
        universe: { reference: { symbol }, target: { ticker: symbol, symbol } },
      },
      ai_analysis: spec.notes || `Daily test of ${symbol}. Figures come from the price path, not from the model.`,
      results: {
        tape,
        analytics,
        assumptions: assumptions(spec, bars, analytics.open_marked),
        untested: spec.untested || [],
        notes: spec.notes || "",
        engine: "desk-daily-1",
        symbol,
        rows: bars.length,
      },
    };
  } catch (err) {
    return failed(text, err instanceof Error ? err.message : "The test failed");
  }
}
