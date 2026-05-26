import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { records2026, corrections } from '@/lib/data'
import { RISK_BG } from '@/lib/types'
import CorrectionFilter from './CorrectionFilter'

export default async function Revision2026Page() {
  const session = await auth()
  if (!session) redirect('/login')

  // Build a map of corrected cell IDs
  const correctedMap: Record<string, Set<string>> = {}
  corrections.forEach(c => {
    const key = String(c.ID)
    if (!correctedMap[key]) correctedMap[key] = new Set()
    correctedMap[key].add(c.Campo)
  })

  const correctedById: Record<number, string[]> = {}
  corrections.forEach(c => {
    if (!correctedById[c.ID]) correctedById[c.ID] = []
    correctedById[c.ID].push(c.Campo)
  })

  const fields: Array<{ key: keyof typeof records2026[0]; label: string }> = [
    { key: 'Tipo Reporte',    label: 'Tipo Reporte' },
    { key: 'Peligro Generico', label: 'Peligro Genérico' },
    { key: 'ATA_100',         label: 'ATA' },
    { key: 'Likelyhood',      label: 'Likelyhood' },
    { key: 'Severity C',      label: 'Severity' },
    { key: 'RiskInd: ALARP',  label: 'Riesgo' },
    { key: 'Indicadores SPI', label: 'Indicadores SPI' },
    { key: 'Conciencia del Error', label: 'Conciencia' },
  ]

  const correctedCount = Object.keys(correctedById).length

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Revisión y Corrección 2026</h1>
          <p className="text-gray-500 text-sm mt-1">
            Revisión exhaustiva de los 70 registros 2026 — correcciones marcadas en rojo
          </p>
          <div className="flex gap-4 mt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-center">
              <p className="text-2xl font-bold text-red-700">{corrections.length}</p>
              <p className="text-xs text-red-600">campos corregidos</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-center">
              <p className="text-2xl font-bold text-orange-700">{correctedCount}</p>
              <p className="text-xs text-orange-600">registros afectados</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center">
              <p className="text-2xl font-bold text-blue-700">{records2026.length - correctedCount}</p>
              <p className="text-xs text-blue-600">registros sin cambios</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />
            Campo corregido
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200 inline-block" />
            Registro con correcciones
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" />
            Sin cambios
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1200px]">
              <thead>
                <tr className="bg-brand-700 text-white">
                  <th className="px-3 py-3 text-left font-semibold">ID</th>
                  <th className="px-3 py-3 text-left font-semibold">Fecha</th>
                  <th className="px-3 py-3 text-left font-semibold">Área</th>
                  <th className="px-3 py-3 text-left font-semibold">Flota</th>
                  {fields.map(f => (
                    <th key={f.key} className="px-3 py-3 text-left font-semibold whitespace-nowrap">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records2026.map((r, i) => {
                  const hasCorrected = Boolean(correctedById[r.ID])
                  const rowClass = hasCorrected
                    ? 'bg-yellow-50 hover:bg-yellow-100'
                    : i % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'

                  return (
                    <tr key={r.ID} className={`${rowClass} transition-colors`}>
                      <td className="px-3 py-2.5 font-mono font-bold text-brand-700">{r.ID}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">
                        {r['Fecha Evento']?.substring(0, 10) ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 max-w-[140px] truncate" title={r.Area_Generadora ?? ''}>
                        {r.Area_Generadora ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{r.Flota ?? '—'}</td>
                      {fields.map(f => {
                        const isCorrected = correctedMap[String(r.ID)]?.has(f.key as string)
                        const value = r[f.key]
                        const displayVal = value ? String(value) : '—'
                        const shortVal = displayVal.length > 40 ? displayVal.substring(0, 40) + '…' : displayVal

                        if (f.key === 'RiskInd: ALARP') {
                          const riskClass = RISK_BG[displayVal] ?? ''
                          return (
                            <td key={f.key} className={`px-3 py-2.5 ${isCorrected ? 'bg-red-50' : ''}`}>
                              {value ? (
                                <span className={`risk-badge text-xs ${riskClass}`}>{displayVal}</span>
                              ) : <span className="text-gray-300">—</span>}
                              {isCorrected && <span className="ml-1 text-red-500 text-xs">✎</span>}
                            </td>
                          )
                        }

                        return (
                          <td
                            key={f.key}
                            className={`px-3 py-2.5 ${isCorrected ? 'bg-red-50 text-red-800 font-semibold' : 'text-gray-700'}`}
                            title={displayVal}
                          >
                            {shortVal}
                            {isCorrected && <span className="ml-1 text-red-500">✎</span>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Corrections detail */}
        <div className="card mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Bitácora Completa de Correcciones</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="table-th">ID</th>
                  <th className="table-th">Fecha</th>
                  <th className="table-th">Campo</th>
                  <th className="table-th">Valor Original</th>
                  <th className="table-th">Valor Corregido</th>
                  <th className="table-th">Justificación</th>
                </tr>
              </thead>
              <tbody>
                {corrections.map((c, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="table-td font-mono text-brand-700">{c.ID}</td>
                    <td className="table-td text-gray-500">{c['Fecha Evento']}</td>
                    <td className="table-td font-medium text-gray-800">{c.Campo}</td>
                    <td className="table-td text-gray-400 italic max-w-[150px] truncate">{c['Valor Original']}</td>
                    <td className="table-td-red max-w-[200px]">{c['Valor Corregido'].substring(0, 80)}</td>
                    <td className="table-td text-gray-500 max-w-[300px]">{c.Justificación}</td>
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
