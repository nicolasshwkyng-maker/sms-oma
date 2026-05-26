'use client'
import { useState, useRef } from 'react'
import type { ClassificationResult, Barrier } from '@/lib/types'
import { RISK_BG } from '@/lib/types'

const EMPTY_RESULT: ClassificationResult = {
  tipo_reporte: '', peligro_generico: '', ata_100: '', ata_sign: '',
  likelyhood: '', severity_c: '', risk_ind: 0, risk_alarp: '',
  indicadores_spi: '', confidence: 0, method: 'rules',
}

const EFF_OPTS = [
  { key: 100, label: '100%', color: '#2563eb', bg: '#eff6ff' },
  { key: 80,  label: '80%',  color: '#16a34a', bg: '#f0fdf4' },
  { key: 50,  label: '50%',  color: '#ca8a04', bg: '#fefce8' },
  { key: 20,  label: '20%',  color: '#ea580c', bg: '#fff7ed' },
  { key: 0,   label: '0%',   color: '#dc2626', bg: '#fef2f2' },
]
const TIPO_OPTS = { T: '⚙️ Tecnología', R: '📋 Reglamentación', E: '🎓 Entrenamiento', O: '🔒 Otro' }
const PROB_EFFECTIVE: Record<string, string> = {
  'Sumamente Improbable': '≥ 90%', Improbable: '65–89%', Ocasional: '35–64%',
  Probable: '10–34%', Frecuente: '< 10%',
}

function calcGlobalEff(barriers: Barrier[]): number | null {
  const ev = barriers.filter(b => b.efectividad >= 0)
  if (!ev.length) return null
  return Math.round(ev.reduce((s, b) => s + b.efectividad, 0) / ev.length)
}
function effToLikelyhood(pct: number): string {
  if (pct >= 90) return 'Sumamente Improbable'
  if (pct >= 65) return 'Improbable'
  if (pct >= 35) return 'Ocasional'
  if (pct >= 10) return 'Probable'
  return 'Frecuente'
}

export default function ClassifierForm() {
  /* ── Form state ────────────────────────────────────────────── */
  const [descripcion, setDescripcion] = useState('')
  const [causa, setCausa] = useState('')
  const [contextFile, setContextFile] = useState<Record<string, string> | null>(null)
  const [barriers, setBarriers] = useState<Barrier[]>([])
  const [bSeq, setBSeq] = useState(0)
  const [bName, setBName] = useState('')
  const [bType, setBType] = useState<'T'|'R'|'E'|'O'>('T')
  const fileRef = useRef<HTMLInputElement>(null)

  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'clasificacion' | 'analisis'>('clasificacion')

  /* ── File upload ───────────────────────────────────────────── */
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const raw = ev.target?.result as string
        let record: Record<string, string> | null = null
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(raw)
          record = Array.isArray(parsed) ? parsed[0] : parsed
        } else if (file.name.endsWith('.csv')) {
          const lines = raw.trim().split('\n')
          const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
          const vals = lines[1]?.split(',').map(v => v.replace(/"/g, '').trim()) ?? []
          record = Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
        }
        if (!record) return
        setContextFile(record)
        // Auto-fill form fields
        const desc = record['Descripción del Evento'] || record['descripcion'] || record['description'] || ''
        const ca   = record['Causa Probable'] || record['causa'] || record['cause'] || ''
        if (desc) setDescripcion(desc)
        if (ca)   setCausa(ca)
      } catch {
        setError('No se pudo leer el archivo. Asegúrese de que sea JSON o CSV válido.')
      }
    }
    reader.readAsText(file)
  }

  /* ── Barriers ──────────────────────────────────────────────── */
  function addBarrier() {
    if (!bName.trim()) return
    const id = bSeq + 1
    setBSeq(id)
    setBarriers(prev => [...prev, { id, nombre: bName.trim(), tipo: bType, efectividad: -1 }])
    setBName('')
  }
  function setEff(id: number, eff: number) {
    setBarriers(prev => prev.map(b => b.id === id ? { ...b, efectividad: b.efectividad === eff ? -1 : eff } : b))
  }
  function removeBarrier(id: number) {
    setBarriers(prev => prev.filter(b => b.id !== id))
  }

  const globalEff = calcGlobalEff(barriers)
  const suggestedLikelyhood = globalEff !== null ? effToLikelyhood(globalEff) : null

  /* ── Classify ──────────────────────────────────────────────── */
  async function handleClassify(e: React.FormEvent) {
    e.preventDefault()
    if (descripcion.trim().length < 20) { setError('La descripción debe tener al menos 20 caracteres'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion, causa, barriers }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setResult(data.result)
      setActiveTab('clasificacion')
    } catch { setError('Error al conectar con el servidor. Intenta nuevamente.') }
    setLoading(false)
  }

  /* ── Helpers ───────────────────────────────────────────────── */
  const methodLabel: Record<string, string> = {
    'claude-api': '🤖 Claude IA (alta precisión)',
    'ml-local':   '⚙️ Motor ML local',
    'rules':      '📋 Reglas',
  }

  const SEV_COLORS: Record<string, string> = {
    Catastrofico: '#c00000', Peligroso: '#e06000', Importante: '#c89600',
    Leve: '#00897b', Insignificante: '#2f6de0',
  }

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      {/* ═══ LEFT PANEL — Input ═══ */}
      <div className="space-y-4">

        {/* Context File Upload */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Cargar reporte (opcional)</h3>
            {contextFile && (
              <button onClick={() => { setContextFile(null); if (fileRef.current) fileRef.current.value = '' }}
                className="text-xs text-red-500 hover:text-red-700">✕ Limpiar</button>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".json,.csv" onChange={handleFile} className="hidden" id="file-upload" />
          <label htmlFor="file-upload"
            className="flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-700">Cargar JSON o CSV</p>
              <p className="text-xs text-gray-400">Se auto-completarán Descripción y Causa del registro</p>
            </div>
          </label>
          {contextFile && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-green-700">✅ Registro cargado</p>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
                {['ID', 'Flota', 'Area_Generadora', 'Tipo Reporte', 'Fecha Evento'].map(k =>
                  contextFile[k] ? (
                    <p key={k} className="text-[10px] text-gray-600">
                      <span className="font-medium">{k}:</span> {contextFile[k]}
                    </p>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>

        {/* Event Data */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Datos del Evento</h3>
          <form onSubmit={handleClassify} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Descripción del Evento <span className="text-red-500">*</span>
              </label>
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                rows={6} required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Describe detalladamente el evento, falla, condición o situación de seguridad observada..."
              />
              <p className="text-xs text-gray-400 mt-0.5">{descripcion.length} caracteres</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Causa Probable</label>
              <textarea value={causa} onChange={e => setCausa(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Causa probable o raíz del evento..."
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg border border-red-200">{error}</div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-brand-700 hover:bg-brand-600 text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Analizando...
                </span>
              ) : '🔍 Clasificar y Analizar Reporte'}
            </button>
          </form>
        </div>

        {/* Barriers */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Defensas Vigentes (ARMS)</h3>
          <p className="text-xs text-gray-400 mb-3">
            Liste las barreras activas. La efectividad global determina la probabilidad ARMS sugerida.
          </p>

          <div className="flex gap-2 mb-3 flex-wrap">
            <input type="text" value={bName} onChange={e => setBName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBarrier())}
              placeholder="Nombre de la defensa o barrera..."
              className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select value={bType} onChange={e => setBType(e.target.value as 'T'|'R'|'E'|'O')}
              className="px-2 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
              {Object.entries(TIPO_OPTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button type="button" onClick={addBarrier}
              className="px-3 py-2 bg-brand-700 text-white text-xs font-semibold rounded-lg hover:bg-brand-600 transition">
              + Agregar
            </button>
          </div>

          {/* Barrier list */}
          <div className="space-y-1.5 mb-3">
            {!barriers.length && (
              <p className="text-xs text-gray-400 italic py-1">Sin barreras registradas.</p>
            )}
            {barriers.map(b => {
              const [icon] = (TIPO_OPTS[b.tipo] || '🔒').split(' ')
              return (
                <div key={b.id}
                  className="flex items-center gap-2 border rounded-lg px-2 py-2 text-xs transition-colors"
                  style={{ borderColor: b.efectividad >= 0 ? (EFF_OPTS.find(e => e.key === b.efectividad)?.color ?? '#e5e7eb') : '#e5e7eb' }}>
                  <span>{icon}</span>
                  <span className="flex-1 font-medium text-gray-700 truncate">{b.nombre}</span>
                  <span className="text-gray-400 text-[10px]">{TIPO_OPTS[b.tipo]?.split(' ')[1]}</span>
                  <div className="flex gap-0.5 flex-shrink-0">
                    {EFF_OPTS.map(e => (
                      <button key={e.key} type="button" onClick={() => setEff(b.id, e.key)}
                        className="px-1.5 py-0.5 rounded border text-[10px] font-mono transition-all"
                        style={{
                          borderColor: b.efectividad === e.key ? e.color : '#e5e7eb',
                          background:  b.efectividad === e.key ? e.bg : 'white',
                          color:       b.efectividad === e.key ? e.color : '#9ca3af',
                          fontWeight:  b.efectividad === e.key ? 700 : 400,
                        }}>{e.label}</button>
                    ))}
                  </div>
                  <button type="button" onClick={() => removeBarrier(b.id)} className="text-gray-300 hover:text-red-500 transition text-xs px-0.5">✕</button>
                </div>
              )
            })}
          </div>

          {/* Global eff summary */}
          {globalEff !== null && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs">
              <span className="font-semibold text-yellow-800">Efectividad global: {globalEff}%</span>
              {' → '}
              <span className="font-bold text-yellow-900">Probabilidad sugerida: {suggestedLikelyhood}</span>
              <span className="text-yellow-700 ml-1">({PROB_EFFECTIVE[suggestedLikelyhood ?? ''] ?? ''})</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT PANEL — Result ═══ */}
      <div className="card">
        <div className="flex border-b border-gray-100">
          {result && (
            <>
              <button onClick={() => setActiveTab('clasificacion')}
                className={`flex-1 py-3 text-xs font-semibold transition-colors ${activeTab === 'clasificacion' ? 'text-brand-700 border-b-2 border-brand-700 bg-brand-50' : 'text-gray-500 hover:text-gray-700'}`}>
                Clasificación SMS
              </button>
              {(result.justificacion_severidad || result.area_gestora) && (
                <button onClick={() => setActiveTab('analisis')}
                  className={`flex-1 py-3 text-xs font-semibold transition-colors ${activeTab === 'analisis' ? 'text-brand-700 border-b-2 border-brand-700 bg-brand-50' : 'text-gray-500 hover:text-gray-700'}`}>
                  Análisis y Gestión
                </button>
              )}
            </>
          )}
          {!result && (
            <div className="flex-1 py-3 text-center text-xs font-semibold text-gray-500">Resultado</div>
          )}
        </div>

        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-80 text-gray-300">
            <svg className="w-14 h-14 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/>
            </svg>
            <p className="text-sm">Ingresa un evento y presiona Clasificar</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-80 text-gray-400">
            <svg className="animate-spin w-10 h-10 mb-3 text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-sm">Analizando el reporte...</p>
          </div>
        )}

        {result && activeTab === 'clasificacion' && (
          <div className="p-4 space-y-3">
            {/* Method badge */}
            <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              <span>{methodLabel[result.method]}</span>
              <span className="font-semibold text-brand-700">{Math.round(result.confidence * 100)}% confianza</span>
            </div>

            {/* Classification fields */}
            {[
              { label: 'Tipo de Reporte', value: result.tipo_reporte },
              { label: 'Peligro Genérico', value: result.peligro_generico },
              { label: 'ATA_100', value: result.ata_100 ? `${result.ata_100} — ${result.ata_sign}` : '—' },
              { label: 'Indicadores SPI', value: result.indicadores_spi || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <span className="text-xs text-gray-500 font-medium">{label}</span>
                <p className="text-sm font-semibold text-gray-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 mt-0.5">{value || '—'}</p>
              </div>
            ))}

            {/* Risk */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-gray-500 font-medium">Severity C</span>
                <p className="text-sm font-bold mt-0.5" style={{ color: SEV_COLORS[result.severity_c] ?? '#374151' }}>
                  {result.severity_c || '—'}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-medium">Likelyhood</span>
                <p className="text-sm font-bold text-gray-700 mt-0.5">{result.likelyhood || '—'}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <span className="text-xs text-gray-500 font-medium">RiskInd</span>
                <p className="text-3xl font-bold text-gray-800 mt-0.5">{result.risk_ind}</p>
              </div>
              <div className="flex-1">
                <span className="text-xs text-gray-500 font-medium">Nivel de Riesgo</span>
                <div className={`mt-1 risk-badge ${RISK_BG[result.risk_alarp] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  {result.risk_alarp}
                </div>
              </div>
            </div>

            {/* Barriers effectiveness summary */}
            {result.efectividad_global !== undefined && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs">
                <p className="font-semibold text-yellow-800">
                  Efectividad barreras: {result.efectividad_global}%
                  {result.likelyhood_from_barriers && ` → Likelyhood por barreras: ${result.likelyhood_from_barriers}`}
                </p>
              </div>
            )}

            {/* PCRP breakdown */}
            {result.severity_pcrp && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Severidad PCRP por criterio</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  {Object.entries(result.severity_pcrp).filter(([k]) => k !== 'peor').map(([k, v]) => (
                    <p key={k}><span className="text-gray-400 capitalize">{k}: </span><span className="font-semibold" style={{ color: SEV_COLORS[v as string] ?? '#374151' }}>{v as string}</span></p>
                  ))}
                </div>
                <p className="text-xs font-bold mt-1" style={{ color: SEV_COLORS[result.severity_pcrp.peor] ?? '#374151' }}>
                  Peor condición: {result.severity_pcrp.peor}
                </p>
              </div>
            )}

            <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
              ⚠️ Resultado orientativo. Verificar con supervisor antes de registrar oficialmente.
            </p>
          </div>
        )}

        {result && activeTab === 'analisis' && (
          <div className="p-4 space-y-4">
            {/* Justificación Severidad */}
            {result.justificacion_severidad && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Justificación de Severidad</p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 text-xs text-gray-700 leading-relaxed">
                  {result.justificacion_severidad}
                </div>
              </div>
            )}

            {/* Justificación Probabilidad */}
            {result.justificacion_probabilidad && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Justificación de Probabilidad</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-gray-700 leading-relaxed">
                  {result.justificacion_probabilidad}
                </div>
              </div>
            )}

            {/* Área Gestora */}
            {result.area_gestora && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Área Gestora Orientativa</p>
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5">
                  <p className="text-sm font-bold text-purple-800">{result.area_gestora}</p>
                  {result.responsable_sugerido && (
                    <p className="text-xs text-purple-600 mt-0.5">Responsable sugerido: {result.responsable_sugerido}</p>
                  )}
                </div>
              </div>
            )}

            {/* Plan de Gestión */}
            {result.plan_gestion && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Plan de Gestión Orientativo</p>
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                  {result.plan_gestion.split('\n').map((line, i) => (
                    <p key={i} className="text-xs text-gray-700 leading-relaxed mb-0.5">{line}</p>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
              ⚠️ Orientativo — la gestión definitiva debe ser validada por el Jefe SMS.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
