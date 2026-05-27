import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { stats, allRecords } from '@/lib/data'
import { RISK_BG } from '@/lib/types'
import DashboardCharts from './DashboardCharts'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const riskDist = Object.entries(stats.by_alarp_2026).sort((a, b) => b[1] - a[1])
  const topPeligros = Object.entries(stats.by_peligro)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const topAreas = Object.entries(stats.by_area_2026)
    .filter(([k]) => k && k !== 'None')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  // Monthly trend 2026
  const monthlyData = Object.entries(stats.by_month_2026 ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({ name, value }))

  // Severity distribution
  const sevData = Object.entries(stats.by_severity ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  // Tipo reporte 2026
  const tipoData = Object.entries(stats.by_tipo_reporte ?? {}).map(([name, value]) => ({ name, value }))

  // Recent records
  const recent = allRecords
    .filter(r => r.Year === 2026)
    .sort((a, b) => new Date(b['Fecha Evento'] ?? 0).getTime() - new Date(a['Fecha Evento'] ?? 0).getTime())
    .slice(0, 8)

  // KPIs con tendencia
  const records2025 = stats.by_year['2025'] ?? 0
  const records2026 = stats.by_year['2026'] ?? 0
  const proRate = stats.proactivo_rate_2026 ?? 0
  const highRisk = stats.high_risk_2026 ?? 0

  const kpis = [
    {
      label: 'Total Reportes',
      value: stats.total_records,
      sub: '2023–2026 histórico',
      color: 'text-brand-700',
      icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z',
      trend: null,
    },
    {
      label: 'Reportes 2026',
      value: records2026,
      sub: `vs ${records2025} en 2025`,
      color: 'text-brand-700',
      icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5',
      trend: records2026 < records2025 ? 'down' : 'up',
    },
    {
      label: 'Riesgo Alto + Extremo',
      value: highRisk,
      sub: 'Reportes 2026',
      color: highRisk > 10 ? 'text-red-600' : 'text-orange-500',
      icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
      trend: null,
    },
    {
      label: 'Tasa Proactiva 2026',
      value: `${proRate}%`,
      sub: `${stats.proactivo_count_2026 ?? 0} de ${records2026} reportes`,
      color: proRate >= 40 ? 'text-green-600' : 'text-orange-500',
      icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
      trend: null,
    },
  ]

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard SMS OMA</h1>
            <p className="text-gray-500 text-sm mt-1">
              Visión general · Sistema de Gestión de Seguridad · Organización de Mantenimiento de Aeronaves
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/clasificador"
              className="flex items-center gap-1.5 text-xs font-semibold bg-brand-700 text-white px-3 py-2 rounded-lg hover:bg-brand-600 transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
              </svg>
              Clasificar
            </Link>
            <Link href="/batch"
              className="flex items-center gap-1.5 text-xs font-semibold border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
              </svg>
              Batch
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map(kpi => (
            <div key={kpi.label} className="card p-5">
              <div className="flex items-start justify-between">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide leading-tight">{kpi.label}</p>
                <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
                  </svg>
                </div>
              </div>
              <p className={`text-3xl font-bold mt-2 ${kpi.color}`}>{kpi.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {kpi.trend === 'up' && (
                  <svg className="w-3 h-3 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"/>
                  </svg>
                )}
                {kpi.trend === 'down' && (
                  <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"/>
                  </svg>
                )}
                <p className="text-xs text-gray-400">{kpi.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Tendencia Mensual 2026
              <span className="ml-2 text-xs font-normal text-gray-400">({monthlyData.length} meses)</span>
            </h3>
            <DashboardCharts type="monthlyTrend" data={monthlyData} />
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Tipo de Reporte</h3>
            <DashboardCharts type="tipoDonut" data={tipoData} />
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Reportes por Año (2023–2026)</h3>
            <DashboardCharts
              type="byYear"
              data={Object.entries(stats.by_year).sort(([a],[b]) => a.localeCompare(b)).map(([y, n]) => ({ name: y, value: n }))}
            />
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Distribución de Riesgo 2026</h3>
              <div className="flex gap-2">
                {riskDist.map(([label, count]) => {
                  const colorMap: Record<string,string> = {
                    'Riesgo Extremo':'text-red-700 bg-red-50 border-red-200',
                    'Riesgo Alto':'text-orange-700 bg-orange-50 border-orange-200',
                    'Riesgo Medio':'text-yellow-700 bg-yellow-50 border-yellow-200',
                    'Riesgo Bajo':'text-green-700 bg-green-50 border-green-200',
                  }
                  return (
                    <span key={label} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorMap[label] ?? ''}`}>
                      {label.replace('Riesgo ','')} {count}
                    </span>
                  )
                })}
              </div>
            </div>
            <DashboardCharts type="riskPie" data={riskDist.map(([name, value]) => ({ name, value }))} />
          </div>
        </div>

        {/* Severity + Peligros + Áreas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Severidad (histórico)</h3>
            <DashboardCharts type="severityBar" data={sevData} />
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Peligros más Frecuentes</h3>
            <div className="space-y-3">
              {topPeligros.map(([peligro, count]) => {
                const code = peligro.split(' - ')[0]
                const desc = peligro.split(' - ')[1] ?? peligro
                const pct  = Math.round((count / stats.total_records) * 100)
                return (
                  <div key={peligro}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="font-medium">{code}</span>
                      <span className="font-bold text-brand-700">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="text-[10px] text-gray-400 mb-1 truncate">{desc}</div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${Math.min(pct * 5.5, 100)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Áreas Generadoras 2026</h3>
            <div className="space-y-2">
              {topAreas.map(([area, count]) => (
                <div key={area} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-600 truncate max-w-[160px]">{area}</span>
                  <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent records */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Reportes Recientes — 2026</h3>
            <Link href="/base-datos" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              Ver todos →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-th">ID</th>
                  <th className="table-th">Fecha</th>
                  <th className="table-th">Área</th>
                  <th className="table-th">Peligro</th>
                  <th className="table-th">Tipo</th>
                  <th className="table-th">Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.ID}>
                    <td className="table-td font-mono text-brand-700">{r.ID}</td>
                    <td className="table-td text-gray-500">{r['Fecha Evento']?.substring(0, 10) ?? '—'}</td>
                    <td className="table-td max-w-[140px] truncate">{r.Area_Generadora ?? '—'}</td>
                    <td className="table-td text-gray-600 max-w-[180px] truncate">
                      {r['Peligro Generico']?.split(' - ')[0] ?? '—'}
                    </td>
                    <td className="table-td">
                      <span className={`risk-badge text-xs ${r['Tipo Reporte'] === 'Reactivo'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {r['Tipo Reporte'] ?? '—'}
                      </span>
                    </td>
                    <td className="table-td">
                      {r['RiskInd: ALARP'] ? (
                        <span className={`risk-badge text-xs ${RISK_BG[r['RiskInd: ALARP']] ?? ''}`}>
                          {r['RiskInd: ALARP']}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  )
}
