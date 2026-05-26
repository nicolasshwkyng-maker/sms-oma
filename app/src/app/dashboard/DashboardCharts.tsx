'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'

const RISK_COLORS_MAP: Record<string, string> = {
  'Riesgo Extremo': '#c00000',
  'Riesgo Alto':    '#ed7d31',
  'Riesgo Medio':   '#ffc000',
  'Riesgo Bajo':    '#70ad47',
}

interface Props {
  type: 'byYear' | 'riskPie'
  data: { name: string; value: number }[]
}

export default function DashboardCharts({ type, data }: Props) {
  if (type === 'byYear') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            formatter={(v: number) => [v, 'Reportes']}
          />
          <Bar dataKey="value" fill="#2e75b6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, value }) => `${value}`}
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={RISK_COLORS_MAP[entry.name] ?? '#8884d8'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(v: number, name: string) => [v, name]}
        />
        <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
