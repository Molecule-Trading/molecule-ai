"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export function EquityChart({ data }: { data: { t: string; equity: number; drawdown: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="#2a2f36" />
          <XAxis dataKey="t" hide />
          <YAxis tick={{ fill: "#8b939e", fontSize: 11 }} width={70} />
          <Tooltip
            contentStyle={{ background: "#121417", border: "1px solid #2a2f36", fontSize: 12 }}
          />
          <Line type="monotone" dataKey="equity" stroke="#e8eaed" dot={false} strokeWidth={1.4} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DrawdownChart({ data }: { data: { t: string; drawdown: number }[] }) {
  const series = data.map((d) => ({ ...d, dd: d.drawdown * 100 }));
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <LineChart data={series}>
          <CartesianGrid stroke="#2a2f36" />
          <XAxis dataKey="t" hide />
          <YAxis tick={{ fill: "#8b939e", fontSize: 11 }} width={70} />
          <Tooltip
            contentStyle={{ background: "#121417", border: "1px solid #2a2f36", fontSize: 12 }}
          />
          <Line type="monotone" dataKey="dd" stroke="#a15c4a" dot={false} strokeWidth={1.4} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
