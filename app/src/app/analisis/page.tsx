import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { allRecords, stats } from '@/lib/data'
import AnalisisCharts from './AnalisisCharts'

export default async function AnalisisPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const df26 = allRecords.filter(r => r.Year === 2026)

  // Peligros 2026 breakdown
  const peligroCount: Record<string, number> = {}
  df26.forEach(r => {
    if (r['Peligro Generico']) {
      const code = r['Peligro Generico'].split(' - ')[0]
      peligroCount[code] = (peligroCount[code] ?? 0) + 1
    }
  })
  const peligroChart = Object.entries(peligroCount).sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  // Tendencias SPI por año
  const spis = [
    { key: 'Datos o procedimientos de mantenimiento incorrectos o deficientes', short: 'Procedimientos' },
    { key: 'Daños graves causados a una aeronave durante las actividades de mantenimiento', short: 'Daños a Aeronave' },
    { key: 'Consulta de textos desactualizados', short: 'Textos desact.' },
    { key: 'Reclamación por garantías', short: 'Garantías' },
    { key: 'Incorrecto almacenaje de componentes aeronáuticos', short: 'Almacenaje' },
  ]
  const spiTrend = [2023, 2024, 2025, 2026].map(year => {
    const rec = allRecords.filter(r => r.Year === year)
    const row: Record<string, number | string> = { year: String(year) }
    spis.forEach(s => {
      row[s.short] = rec.filter(r => r['Indicadores SPI'] === s.key).length
    })
    return row
  })

  // Factores comunes
  const factores = [
    {
      titulo: 'Documentación Inapropiada (DOC)',
      count: df26.filter(r => r['Peligro Generico']?.includes('DOC')).length,
      areas: Array.from(new Set(df26.filter(r => r['Peligro Generico']?.includes('DOC')).map(r => r.Area_Generadora).filter(Boolean))).slice(0, 3).join(', '),
      riesgo: 'Riesgo Medio - Alto',
      accion: 'Auditoría documental mensual + sistema centralizado de versiones + alertas de vencimiento',
      responsable: 'Biblioteca y Registros Técnicos / Ingeniería',
      color: 'border-blue-300 bg-blue-50',
    },
    {
      titulo: 'Operaciones Inadecuadas en Tierra (GH)',
      count: df26.filter(r => r['Peligro Generico']?.includes('GH')).length,
      areas: Array.from(new Set(df26.filter(r => r['Peligro Generico']?.includes('GH')).map(r => r.Area_Generadora).filter(Boolean))).slice(0, 3).join(', '),
      riesgo: 'Riesgo Alto - Extremo',
      accion: 'Comunicación formal a empresas de rampa + señalización reforzada + capacitación ground safety',
      responsable: 'Seguridad Operacional / Inspección y Calidad',
      color: 'border-orange-300 bg-orange-50',
    },
    {
      titulo: 'Mantenimiento Deficiente (MDA)',
      count: df26.filter(r => r['Peligro Generico']?.includes('MDA')).length,
      areas: Array.from(new Set(df26.filter(r => r['Peligro Generico']?.includes('MDA')).map(r => r.Area_Generadora).filter(Boolean))).slice(0, 3).join(', '),
      riesgo: 'Riesgo Alto',
      accion: 'Seguimiento diario NRIs críticos + gestión proactiva cadena de suministro + auditoría tasa de cierre',
      responsable: 'Centro de Control Mantenimiento / Planeación',
      color: 'border-red-300 bg-red-50',
    },
    {
      titulo: 'Instalaciones del Hangar (HAN)',
      count: df26.filter(r => r['Peligro Generico']?.includes('HAN')).length,
      areas: Array.from(new Set(df26.filter(r => r['Peligro Generico']?.includes('HAN')).map(r => r.Area_Generadora).filter(Boolean))).slice(0, 3).join(', '),
      riesgo: 'Riesgo Medio',
      accion: 'Inventario crítico de herramientas y equipamiento + plan de reposición trimestral + reporte semanal de deficiencias',
      responsable: 'Mantenimiento / Seguridad Operacional',
      color: 'border-yellow-300 bg-yellow-50',
    },
    {
      titulo: 'Procedimientos Incorrectos (PRO)',
      count: df26.filter(r => r['Peligro Generico']?.includes('PRO')).length,
      areas: Array.from(new Set(df26.filter(r => r['Peligro Generico']?.includes('PRO')).map(r => r.Area_Generadora).filter(Boolean))).slice(0, 3).join(', '),
      riesgo: 'Riesgo Medio - Alto',
      accion: 'Check-list obligatorio de apertura de tarea + verificación de procedimiento antes de inicio + supervisión reforzada',
      responsable: 'Inspección y Calidad / Ingeniería',
      color: 'border-purple-300 bg-purple-50',
    },
    {
      titulo: 'FOD — Objetos Extraños',
      count: df26.filter(r => r['Peligro Generico']?.includes('FOD')).length,
      areas: Array.from(new Set(df26.filter(r => r['Peligro Generico']?.includes('FOD')).map(r => r.Area_Generadora).filter(Boolean))).slice(0, 3).join(', '),
      riesgo: 'Riesgo Medio',
      accion: 'FOD Walk diario en hangar y rampa + protocolo de inspección post-mantenimiento + canecas en puntos estratégicos',
      responsable: 'Seguridad Operacional / Mantenimiento',
      color: 'border-green-300 bg-green-50',
    },
  ].sort((a, b) => b.count - a.count)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Análisis de Factores Comunes</h1>
          <p className="text-gray-500 text-sm mt-1">
            Identificación de factores recurrentes para gestión compartida y planes de acción 2026
          </p>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Peligros Genéricos — 2026</h3>
            <AnalisisCharts type="peligroBar" data={peligroChart} />
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Tendencia Indicadores SPI (2023–2026)</h3>
            <AnalisisCharts type="spiTrend" data={spiTrend} keys={spis.map(s => s.short)} />
          </div>
        </div>

        {/* Factores comunes cards */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Factores Comunes — Planes de Acción Compartidos</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {factores.map(f => (
            <div key={f.titulo} className={`rounded-xl border-2 p-5 ${f.color}`}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-sm">{f.titulo}</h3>
                <span className="text-2xl font-bold text-gray-700 ml-2">{f.count}</span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium text-gray-600">Áreas: </span>
                  <span className="text-gray-700">{f.areas || 'Varias'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Nivel: </span>
                  <span className="text-gray-700">{f.riesgo}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Plan de Acción: </span>
                  <span className="text-gray-700">{f.accion}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Responsable: </span>
                  <span className="text-gray-700 font-semibold">{f.responsable}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* KPIs section */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Indicadores SPI — Valores 2026</h3>
          <div className="space-y-3">
            {spis.map(s => {
              const count = allRecords.filter(r => r.Year === 2026 && r['Indicadores SPI'] === s.key).length
              const histCount = allRecords.filter(r => r.Year < 2026 && r['Indicadores SPI'] === s.key).length
              const avg = (histCount / 3).toFixed(1)
              const trend = count > parseFloat(avg) ? '↑' : count < parseFloat(avg) ? '↓' : '→'
              const trendColor = count > parseFloat(avg) ? 'text-red-600' : 'text-green-600'
              return (
                <div key={s.key} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{s.short}</p>
                    <p className="text-xs text-gray-400 truncate">{s.key}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold text-gray-800">{count}</span>
                    <span className="text-xs text-gray-400 ml-1">2026</span>
                  </div>
                  <div className={`text-sm font-bold ${trendColor} w-6 text-center shrink-0`}>{trend}</div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-gray-400">Prom. hist.: {avg}/año</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
