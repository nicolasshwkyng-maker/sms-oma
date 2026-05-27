'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  ResponsiveContainer, Legend, LineChart, Line, CartesianGrid,
} from 'recharts'

const RISK_COLORS: Record<string, string> = {
  'Riesgo Extremo': '#c00000',
  'Riesgo Alto':    '#ed7d31',
  'Riesgo Medio':   '#ffc000',
  'Riesgo Bajo':    '#70ad47',
}
const SEV_COLORS: Record<string, string> = {
  'Catastrofico':   '#c00000',
  'Peligroso':      '#ed7d31',
  'Importante':     '#ffc000',
  'Leve':           '#70ad47',
  'Insignificante': '#2563eb',
}
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }

interface Props {
  type: 'byYear' | 'riskPie' | 'monthlyTrend' | 'severityBar' | 'tipoDonut'
  data: { name: string; value: number }[]
}

export default function DashboardCharts({ type, data }: Props) {

  if (type === 'byYear') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, 'Reportes']} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? '#1e4d8c' : '#2e75b6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'riskPie') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
            outerRadius={75} innerRadius={35}
            label={({ value }) => value} labelLine={false}>
            {data.map((entry, i) => (
              <Cell key={i} fill={RISK_COLORS[entry.name] ?? '#8884d8'} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [v, name]} />
          <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'monthlyTrend') {
    const formatted = data.map(d => ({ ...d, name: d.name.replace(/^\d{4}-/, '') }))
    return (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={formatted} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, 'Reportes']} />
          <Line type="monotone" dataKey="value" stroke="#2e75b6" strokeWidth={2.5}
            dot={{ r: 4, fill: '#2e75b6' }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'severityBar') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, 'Reportes']} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={SEV_COLORS[entry.name] ?? '#8884d8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'tipoDonut') {
    const TIPO_COLORS = ['#2e75b6', '#ed7d31']
    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
            outerRadius={75} innerRadius={45}
            label={({ value }) => value} labelLine={false}>
            {data.map((_, i) => <Cell key={i} fill={TIPO_COLORS[i % 2]} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [v, name]} />
          <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  return null
}
