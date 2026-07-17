"use client";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const GREENS = ["#4ade80", "#22c55e", "#38bdf8", "#a3e635", "#2dd4bf", "#facc15", "#fb923c"];

const tooltipStyle = {
  background: "rgba(10,15,26,0.95)",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

export function StatusPie({ data }: { data: { name: string; value: number; color: string }[] }) {
  const filtered = data.filter((d) => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          innerRadius={52}
          outerRadius={80}
          paddingAngle={3}
          stroke="none"
        >
          {filtered.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CategoryBar({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: "#94a3b8", fontSize: 10 }}
          axisLine={{ stroke: "rgba(148,163,184,0.2)" }}
          tickLine={false}
          interval={0}
          angle={-12}
          textAnchor="end"
          height={44}
        />
        <YAxis
          tick={{ fill: "#94a3b8", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(56,189,248,0.06)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={GREENS[i % GREENS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
