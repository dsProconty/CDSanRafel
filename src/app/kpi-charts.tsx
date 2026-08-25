"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PuntoCobranza = { mes: string; facturado: number; cobrado: number };
export type EstadoCasasData = { name: string; value: number; color: string }[];

function TooltipMoneda({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5" style={{ color: p.color }}>
          {p.name}: ${p.value.toLocaleString("es-EC", { maximumFractionDigits: 0 })}
        </p>
      ))}
    </div>
  );
}

export function CobranzaMensualChart({ datos }: { datos: PuntoCobranza[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={datos} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={45}
          tickFormatter={(v) => `$${Number(v) / 1000}k`}
        />
        <Tooltip content={<TooltipMoneda />} cursor={{ fill: "var(--accent)" }} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(value) => <span className="text-muted-foreground">{value}</span>}
        />
        <Bar dataKey="facturado" name="Facturado" fill="var(--info)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="cobrado" name="Cobrado" fill="var(--success)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EstadoCasasDonut({ datos }: { datos: EstadoCasasData }) {
  const total = datos.reduce((acc, d) => acc + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={datos}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            strokeWidth={0}
          >
            {datos.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value} casas`, name]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{total}</span>
        <span className="text-xs text-muted-foreground">casas</span>
      </div>
    </div>
  );
}
