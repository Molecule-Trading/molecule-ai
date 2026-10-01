"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { fill: "#8b939e", fontSize: 11, fontFamily: "IBM Plex Mono, ui-monospace, monospace" };
const GRID = "#22262c";
const TIP = { background: "#121417", border: "1px solid #2a2f36", borderRadius: 8, fontSize: 12 };

function spanDays(data: { t: string }[]) {
  if (data.length < 2) return 1;
  const a = Date.parse(data[0].t);
  const b = Date.parse(data[data.length - 1].t);
  return Math.max(1, (b - a) / 86400000);
}

function tickOf(iso: string, days: number) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (days > 800) return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  if (days > 60) return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit", timeZone: "UTC" });
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

function stamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function money(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const frame = { top: 12, right: 4, left: 8, bottom: 0 };

export function EquityChart({
  data,
  height = 300,
  splitAt,
}: {
  data: { t: string; equity: number }[];
  height?: number;
  splitAt?: string;
}) {
  const days = spanDays(data);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={frame}>
          <defs>
            <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8eaed" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#e8eaed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="t"
            tick={AXIS}
            tickFormatter={(v) => tickOf(String(v), days)}
            minTickGap={56}
            axisLine={{ stroke: "#2a2f36" }}
            tickLine={false}
          />
          <YAxis
            orientation="right"
            tick={AXIS}
            width={72}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => money(Number(v))}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={TIP}
            labelFormatter={(v) => stamp(String(v))}
            formatter={(v) => [money(Number(v)), "Equity"]}
          />
          {splitAt && <ReferenceLine x={splitAt} stroke="#8b939e" strokeDasharray="3 3" />}
          <Area type="monotone" dataKey="equity" stroke="#e8eaed" strokeWidth={1.6} fill="url(#eqFill)" isAnimationActive animationDuration={700} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DrawdownChart({ data, height = 220 }: { data: { t: string; drawdown: number }[]; height?: number }) {
  const days = spanDays(data);
  const series = data.map((d) => ({ ...d, dd: d.drawdown * 100 }));
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} margin={frame}>
          <defs>
            <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8eaed" stopOpacity={0.02} />
              <stop offset="100%" stopColor="#c45c4a" stopOpacity={0.45} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="t"
            tick={AXIS}
            tickFormatter={(v) => tickOf(String(v), days)}
            minTickGap={56}
            axisLine={{ stroke: "#2a2f36" }}
            tickLine={false}
          />
          <YAxis
            orientation="right"
            tick={AXIS}
            width={72}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
          />
          <Tooltip
            contentStyle={TIP}
            labelFormatter={(v) => stamp(String(v))}
            formatter={(v) => [`${Number(v).toFixed(2)}%`, "Drawdown"]}
          />
          <Area type="monotone" dataKey="dd" stroke="#c45c4a" strokeWidth={1.5} fill="url(#ddFill)" isAnimationActive animationDuration={700} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonteCarloChart({
  data,
  height = 260,
}: {
  data: { t: string; p50: number; band: [number, number] }[];
  height?: number;
}) {
  const days = spanDays(data);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={frame}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="t"
            tick={AXIS}
            tickFormatter={(v) => tickOf(String(v), days)}
            minTickGap={56}
            axisLine={{ stroke: "#2a2f36" }}
            tickLine={false}
          />
          <YAxis
            orientation="right"
            tick={AXIS}
            width={72}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => money(Number(v))}
          />
          <Tooltip
            contentStyle={TIP}
            labelFormatter={(v) => stamp(String(v))}
            formatter={(v, name) => {
              if (name === "band" && Array.isArray(v)) return [`${money(Number(v[0]))} – ${money(Number(v[1]))}`, "10–90%"];
              return [money(Number(v)), "Median"];
            }}
          />
          <Area type="monotone" dataKey="band" stroke="none" fill="rgba(232,234,237,0.14)" isAnimationActive animationDuration={700} />
          <Line type="monotone" dataKey="p50" stroke="#e8eaed" dot={false} strokeWidth={1.6} isAnimationActive animationDuration={700} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
