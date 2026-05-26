import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { stats, allRecords } from '@/lib/data'
import { RISK_BG } from '@/lib/types'
import DashboardCharts from './DashboardCharts'

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

  // Últimos 8 reportes del año en curso
  const recent = allRecords
    .filter(r => r.Year === 2026)
    .sort((a, b) => new Date(b['Fecha Evento'] ?? 0).getTime() - new Date(a['Fecha Evento'] ?? 0).getTime())
    .slice(0, 8)

  const kpis = [
    { label: 'Total Reportes',      value: stats.total_records,      sub: '2023–2026',    color: 'text-brand-700' },
    { label: 'Reportes 2026',       value: stats.by_year['2026'],     sub: 'Año en curso', color: 'text-brand-700' },
    { label: 'Riesgo Alto / Extremo', value: stats.high_risk_2026,   sub: 'En 2026',      color: 'text-red-600'   },
    { label: 'Reactivos 2026',
      value: allRecords.filter(r => r.Year === 2026 && r['Tipo Reporte'] === 'Reactivo').length,
      sub: 'Eventos ocurridos', color: 'text-orange-600' },
  ]

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard SMS OMA</h1>
          <p className="text-gray-500 text-sm mt-1">
            Visión general del Sistema de Gestión de Seguridad — Organización de Mantenimiento de Aeronaves
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map(kpi => (
            <div key={kpi.label} className="card">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{kpi.label}</p>
              <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Reportes por Año</h3>
            <DashboardCharts
              type="byYear"
              data={Object.entries(stats.by_year).map(([y, n]) => ({ name: y, value: n }))}
            />
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribución de Riesgo 2026</h3>
            <DashboardCharts
              type="riskPie"
              data={riskDist.map(([name, value]) => ({ name, value }))}
            />
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Top peligros */}
          <div className="card lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Peligros Genéricos más Frecuentes (histórico)
            </h3>
            <div className="space-y-3">
              {topPeligros.map(([peligro, count]) => {
                const code = peligro.split(' - ')[0]
                const desc = peligro.split(' - ')[1] ?? peligro
                const pct  = Math.round((count / stats.total_records) * 100)
                return (
                  <div key={peligro}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="font-medium">{code} — {desc.substring(0, 48)}</span>
                      <span className="font-bold text-brand-700">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct * 3}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top áreas */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Áreas — Reportes 2026</h3>
            <div className="space-y-2">
              {topAreas.map(([area, count]) => (
                <div key={area} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-600 truncate max-w-[160px]">{area}</span>
                  <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full shrink-0">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Últimos reportes */}
        <div className="card mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Reportes Recientes — 2026</h3>
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
