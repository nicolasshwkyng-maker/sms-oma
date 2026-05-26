'use client'
import { useState, useMemo } from 'react'
import type { SMSRecord } from '@/lib/types'
import { RISK_BG } from '@/lib/types'

const PELIGROS = [
  'ALM','DGA','DOC','FH','FOD','GAR','GH','HAN','HER','MDA','PRO',
]
const YEARS = ['2023','2024','2025','2026']
const ALARP = ['Riesgo Extremo','Riesgo Alto','Riesgo Medio','Riesgo Bajo']

export default function DatabaseClient({ records }: { records: SMSRecord[] }) {
  const [search, setSearch] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterPeligro, setFilterPeligro] = useState('')
  const [filterAlarp, setFilterAlarp] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterYear && String(r.Year) !== filterYear) return false
      if (filterPeligro && !r['Peligro Generico']?.includes(filterPeligro)) return false
      if (filterAlarp && r['RiskInd: ALARP'] !== filterAlarp) return false
      if (search) {
        const s = search.toLowerCase()
        return (
          String(r.ID).includes(s) ||
          r['Descripción del Evento']?.toLowerCase().includes(s) ||
          r.Area_Generadora?.toLowerCase().includes(s) ||
          r.Flota?.toLowerCase().includes(s)
        )
      }
      return true
    })
  }, [records, search, filterYear, filterPeligro, filterAlarp])

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Buscar por ID, descripción, área..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(0) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Todos los años</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterPeligro} onChange={e => { setFilterPeligro(e.target.value); setPage(0) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Todos los peligros</option>
          {PELIGROS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterAlarp} onChange={e => { setFilterAlarp(e.target.value); setPage(0) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Todos los riesgos</option>
          {ALARP.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg">
          {filtered.length} resultados
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-brand-700 text-white">
                <th className="px-3 py-3 text-left font-semibold">ID</th>
                <th className="px-3 py-3 text-left font-semibold">Fecha</th>
                <th className="px-3 py-3 text-left font-semibold">Área</th>
                <th className="px-3 py-3 text-left font-semibold">Flota</th>
                <th className="px-3 py-3 text-left font-semibold">Tipo</th>
                <th className="px-3 py-3 text-left font-semibold">Peligro</th>
                <th className="px-3 py-3 text-left font-semibold">ATA</th>
                <th className="px-3 py-3 text-left font-semibold">Riesgo</th>
                <th className="px-3 py-3 text-left font-semibold">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r, i) => (
                <tr key={r.ID} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50 transition-colors`}>
                  <td className="px-3 py-2.5 font-mono font-bold text-brand-700">{r.ID}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">{r['Fecha Evento']?.substring(0, 10) ?? '—'}</td>
                  <td className="px-3 py-2.5 max-w-[120px] truncate" title={r.Area_Generadora ?? ''}>{r.Area_Generadora ?? '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.Flota ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`risk-badge text-xs ${r['Tipo Reporte'] === 'Reactivo' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {r['Tipo Reporte'] ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 max-w-[120px] truncate" title={r['Peligro Generico'] ?? ''}>
                    {r['Peligro Generico']?.split(' - ')[0] ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-gray-500">{r.ATA_100 ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    {r['RiskInd: ALARP'] ? (
                      <span className={`risk-badge text-xs ${RISK_BG[r['RiskInd: ALARP']] ?? ''}`}>
                        {r['RiskInd: ALARP']}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 max-w-[250px] truncate text-gray-600"
                    title={r['Descripción del Evento'] ?? ''}>
                    {r['Descripción del Evento']?.substring(0, 80) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-white"
            >
              ← Anterior
            </button>
            <span className="px-3 py-1.5 text-xs text-gray-600">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-white"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
