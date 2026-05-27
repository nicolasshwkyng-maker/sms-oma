'use client'
import { useState, useMemo, useEffect } from 'react'
import type { SMSRecord } from '@/lib/types'
import { RISK_BG } from '@/lib/types'

const PELIGROS = ['ALM','DGA','DOC','FH','FOD','GAR','GH','HAN','HER','MDA','PRO']
const YEARS    = ['2023','2024','2025','2026']
const ALARP    = ['Riesgo Extremo','Riesgo Alto','Riesgo Medio','Riesgo Bajo']

const SEV_COLOR: Record<string, string> = {
  Catastrofico: '#c00000', Peligroso: '#e06000',
  Importante: '#c89600', Leve: '#00897b', Insignificante: '#2f6de0',
}
const ALARP_DOT: Record<string, string> = {
  'Riesgo Extremo': 'bg-red-500',
  'Riesgo Alto':    'bg-orange-400',
  'Riesgo Medio':   'bg-yellow-400',
  'Riesgo Bajo':    'bg-green-500',
}

/* ══════════════════════════════════════════════════════════════════════════════
   MODAL — full report mosaic view
══════════════════════════════════════════════════════════════════════════════ */
function ReportModal({ record, onClose }: { record: SMSRecord; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const r = record
  const alarp   = r['RiskInd: ALARP'] ?? ''
  const severity = r['Severity C'] ?? ''

  // Tile helper
  function Tile({ label, value, wide, mono, color }: {
    label: string; value?: string | number | null
    wide?: boolean; mono?: boolean; color?: string
  }) {
    const v = value !== null && value !== undefined && String(value).trim() !== '' && String(value) !== 'None'
      ? String(value) : '—'
    return (
      <div className={`bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-700 ${wide ? 'col-span-2' : ''}`}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{label}</p>
        <p className={`text-sm leading-snug break-words ${mono ? 'font-mono' : 'font-medium'}`}
          style={{ color: color ?? undefined }}>
          {v}
        </p>
      </div>
    )
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-700 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm font-mono">#{r.ID}</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                {r['Fecha Evento']?.substring(0, 10) ?? '—'} · {r.Flota ?? '—'} · {r.Base ?? '—'}
              </p>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5 leading-snug">
                {r.Area_Generadora ?? '—'}
                {r.Matricula ? <span className="ml-2 text-xs font-mono text-gray-400">({r.Matricula})</span> : null}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {r['Tipo Reporte'] && (
                  <span className={`risk-badge text-[10px] ${r['Tipo Reporte'] === 'Reactivo' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {r['Tipo Reporte']}
                  </span>
                )}
                {alarp && (
                  <span className={`risk-badge text-[10px] ${RISK_BG[alarp] ?? ''}`}>
                    {alarp}
                  </span>
                )}
                {r.Estatus && (
                  <span className="risk-badge text-[10px] bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                    {r.Estatus}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg shrink-0 ml-4">
            ✕
          </button>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* ─ Descripción y Causa ─ */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-300 mb-3">
              📋 Descripción del Evento
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {r['Descripción del Evento'] ?? '—'}
              </p>
            </div>
            {r['Causa Probable'] && (
              <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-4 border border-orange-100 dark:border-orange-900 mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1">Causa Probable</p>
                <p className="text-sm text-orange-900 dark:text-orange-200 leading-relaxed">
                  {r['Causa Probable']}
                </p>
              </div>
            )}
          </section>

          {/* ─ Mosaico de clasificación ─ */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-300 mb-3">
              🏷️ Clasificación SMS
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Tile label="Peligro Genérico" value={r['Peligro Generico']} wide />
              <Tile label="ATA 100"      value={r.ATA_100}  mono />
              <Tile label="ATA Descripción" value={r['ATA_100: ATA_Sign']} />
              <Tile label="Descriptor SRVSOP" value={r.Descriptor} mono />
              <Tile label="Indicadores SPI"   value={r['Indicadores SPI']} wide />
            </div>
          </section>

          {/* ─ Valoración de riesgo ─ */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-300 mb-3">
              ⚖️ Valoración de Riesgo ARMS
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Severity C</p>
                <p className="text-base font-bold" style={{ color: SEV_COLOR[severity] ?? '#374151' }}>
                  {severity || '—'}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Likelyhood</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{r.Likelyhood ?? '—'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Risk Index (UR)</p>
                <p className="text-2xl font-black text-gray-800 dark:text-gray-100">{r.RiskInd ?? '—'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">ALARP</p>
                {alarp ? (
                  <span className={`risk-badge text-xs ${RISK_BG[alarp] ?? ''}`}>{alarp}</span>
                ) : <span className="text-gray-300">—</span>}
              </div>
            </div>
            {/* Second row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              <Tile label="Likelyhood 2 (residual)"   value={r['RiskInd: Likelyhood2']} />
              <Tile label="Risk Residual (UR)"         value={r.ResRiskInd}              mono />
              <Tile label="ALARP Residual"             value={r['ResRiskInd: ALARP2']}   />
              <Tile label="Tolerabilidad Residual"     value={r['Tolerabilidad Residual']} wide />
              <Tile label="Días de gestión"            value={r['RiskInd: Days']}         mono />
            </div>
          </section>

          {/* ─ Defensas y consecuencias ─ */}
          {(r['Defensas Actuales Para Controlar el Riesgo'] || r.Consecuencias) && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-300 mb-3">
                🛡️ Defensas y Consecuencias
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {r['Defensas Actuales Para Controlar el Riesgo'] && (
                  <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4 border border-green-100 dark:border-green-900">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 mb-1">Defensas Actuales</p>
                    <p className="text-sm text-green-900 dark:text-green-200 leading-relaxed whitespace-pre-wrap">
                      {r['Defensas Actuales Para Controlar el Riesgo']}
                    </p>
                  </div>
                )}
                {r.Consecuencias && (
                  <div className="bg-red-50 dark:bg-red-950 rounded-xl p-4 border border-red-100 dark:border-red-900">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">Consecuencias</p>
                    <p className="text-sm text-red-900 dark:text-red-200 leading-relaxed">{r.Consecuencias}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ─ Plan y Gestión ─ */}
          {(r['Plan de Acción'] || r['Resp. Gestion'] || r['Conciencia del Error']) && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-300 mb-3">
                📌 Gestión y Plan de Acción
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                <Tile label="Responsable Gestión"  value={r['Resp. Gestion']} />
                <Tile label="Conciencia del Error" value={r['Conciencia del Error']} />
                <Tile label="Retroalimentación"    value={r.Retroalimentación} />
              </div>
              {r['Plan de Acción'] && (
                <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 border border-blue-100 dark:border-blue-900">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Plan de Acción</p>
                  <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed whitespace-pre-wrap">{r['Plan de Acción']}</p>
                </div>
              )}
            </section>
          )}

          {/* ─ Datos generales ─ */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-300 mb-3">
              🗂️ Datos Generales
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Tile label="Origen Reporte"    value={r.Origen_Reporte} />
              <Tile label="Área Causante"     value={r.Area_Causante} />
              <Tile label="Sub-Área Causante" value={r.Sub_Area_Causante} />
              <Tile label="Hora del Evento"   value={r['Hora del Evento']} />
              <Tile label="Matrícula"         value={r.Matricula}  mono />
              <Tile label="Base"              value={r.Base} />
            </div>
          </section>

        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0 bg-gray-50 dark:bg-gray-900">
          <p className="text-[10px] text-gray-400">
            ID {r.ID} · {r.Tipo_Elemento ?? 'Reporte SMS'} · {r['Fecha Evento']?.substring(0, 10) ?? ''}
          </p>
          <button onClick={onClose}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function DatabaseClient({ records }: { records: SMSRecord[] }) {
  const [search, setSearch]           = useState('')
  const [filterYear, setFilterYear]   = useState('')
  const [filterPeligro, setFilterPeligro] = useState('')
  const [filterAlarp, setFilterAlarp] = useState('')
  const [page, setPage]               = useState(0)
  const [selected, setSelected]       = useState<SMSRecord | null>(null)
  const PAGE_SIZE = 20

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterYear    && String(r.Year) !== filterYear) return false
      if (filterPeligro && !r['Peligro Generico']?.includes(filterPeligro)) return false
      if (filterAlarp   && r['RiskInd: ALARP'] !== filterAlarp) return false
      if (search) {
        const s = search.toLowerCase()
        return (
          String(r.ID).includes(s) ||
          r['Descripción del Evento']?.toLowerCase().includes(s) ||
          r.Area_Generadora?.toLowerCase().includes(s) ||
          r.Flota?.toLowerCase().includes(s) ||
          r['Peligro Generico']?.toLowerCase().includes(s)
        )
      }
      return true
    })
  }, [records, search, filterYear, filterPeligro, filterAlarp])

  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div>
      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text" value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Buscar por ID, descripción, área, peligro..."
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

      {/* ── Table ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
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
                <th className="px-3 py-3 text-left font-semibold">Severidad</th>
                <th className="px-3 py-3 text-left font-semibold">Riesgo</th>
                <th className="px-3 py-3 text-left font-semibold">Descripción</th>
                <th className="px-3 py-3 text-center font-semibold w-16">Ver</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r, i) => {
                const alarp    = r['RiskInd: ALARP'] ?? ''
                const severity = r['Severity C'] ?? ''
                return (
                  <tr key={r.ID}
                    onClick={() => setSelected(r)}
                    className={`cursor-pointer transition-colors ${
                      i % 2 === 0
                        ? 'bg-white dark:bg-gray-800'
                        : 'bg-gray-50/50 dark:bg-gray-750'
                    } hover:bg-blue-50 dark:hover:bg-blue-950/30`}
                  >
                    <td className="px-3 py-2.5 font-mono font-bold text-brand-700 dark:text-blue-400">{r.ID}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">{r['Fecha Evento']?.substring(0, 10) ?? '—'}</td>
                    <td className="px-3 py-2.5 max-w-[110px] truncate" title={r.Area_Generadora ?? ''}>{r.Area_Generadora ?? '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.Flota ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {r['Tipo Reporte'] ? (
                        <span className={`risk-badge text-[10px] ${r['Tipo Reporte'] === 'Reactivo' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {r['Tipo Reporte']}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 max-w-[80px] truncate font-mono text-gray-600 dark:text-gray-300" title={r['Peligro Generico'] ?? ''}>
                      {r['Peligro Generico']?.split(' - ')[0] ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-[11px]"
                      style={{ color: SEV_COLOR[severity] ?? '#9ca3af' }}>
                      {severity || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {alarp ? (
                        <span className={`risk-badge text-[10px] ${RISK_BG[alarp] ?? ''}`}>
                          {alarp.replace('Riesgo ', '')}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 max-w-[220px] truncate text-gray-600 dark:text-gray-300">
                      {r['Descripción del Evento']?.substring(0, 70) ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(r) }}
                        className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-900 text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-800 transition-colors flex items-center justify-center mx-auto"
                        title="Ver reporte completo"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500">
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-white dark:hover:bg-gray-700 transition-colors">
              ← Anterior
            </button>
            <span className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400">
              {page + 1} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-white dark:hover:bg-gray-700 transition-colors">
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-gray-400 mt-2 text-center">
        Haz clic en cualquier fila o en el ícono 👁 para ver el reporte completo
      </p>

      {/* Modal */}
      {selected && <ReportModal record={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
