'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import type { ClassificationResult, Barrier } from '@/lib/types'
import { RISK_BG } from '@/lib/types'
import barrierSuggestionsRaw from '@/data/barrier_suggestions.json'

/* ── Constants ─────────────────────────────────────────────── */
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
const TIPO_OPTS: Record<string, string> = {
  T: '⚙️ Tecnología', R: '📋 Reglamentación', E: '🎓 Entrenamiento', O: '🔒 Otro',
}
const PROB_EFFECTIVE: Record<string, string> = {
  'Sumamente Improbable': '≥ 90%', Improbable: '65–89%', Ocasional: '35–64%',
  Probable: '10–34%', Frecuente: '< 10%',
}
const SEV_COLORS: Record<string, string> = {
  Catastrofico: '#c00000', Peligroso: '#e06000', Importante: '#c89600',
  Leve: '#00897b', Insignificante: '#2f6de0',
}
const methodLabel: Record<string, string> = {
  'claude-api': '🤖 Claude IA (alta precisión)',
  'ml-local':   '⚙️ Motor ML local',
  'rules':      '📋 Reglas',
}
const LS_KEY = 'sms_oma_historial'
const MAX_HIST = 10

/* ── Barrier Suggestions ───────────────────────────────────────── */
interface BarrierSuggestion { id: number; tipo: string; nombre: string; ref: string }
const BARRIER_SUGGESTIONS = barrierSuggestionsRaw as Record<string, BarrierSuggestion[]>
const SUGG_TIPO_CLS: Record<string, string> = {
  T: 'bg-blue-50 text-blue-700 border-blue-200',
  R: 'bg-green-50 text-green-700 border-green-200',
  E: 'bg-amber-50 text-amber-700 border-amber-200',
  O: 'bg-gray-100 text-gray-600 border-gray-200',
}

/* ── Types ─────────────────────────────────────────────────── */
interface HistEntry {
  id: string
  ts: number
  descripcion_preview: string
  risk_alarp: string
  risk_ind: number
  severity_c: string
  likelyhood: string
  barriers_count: number
  result: ClassificationResult
}

/* ── Helpers ───────────────────────────────────────────────── */
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
function loadHistorial(): HistEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}
function saveHistorial(entries: HistEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, MAX_HIST)))
}
function riskColor(alarp: string) {
  if (alarp === 'EXTREMO') return '#c00000'
  if (alarp === 'ALTO') return '#e06000'
  if (alarp === 'MEDIO') return '#c89600'
  return '#375623'
}

/* ── PDF Export ────────────────────────────────────────────── */
function exportPDF(
  result: ClassificationResult,
  descripcion: string,
  causa: string,
  barriers: Barrier[],
  contextFile: Record<string, string> | null,
) {
  const globalEff = calcGlobalEff(barriers)
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<title>Clasificación SMS — ${result.tipo_reporte || 'Reporte'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1f2e; background: #fff; padding: 12mm 14mm; }
  h1 { font-size: 16px; font-weight: 700; color: #1e3a5f; margin-bottom: 3px; }
  .sub { font-size: 10px; color: #7a82a0; margin-bottom: 10mm; }
  .section { margin-bottom: 6mm; }
  .section-title { font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
    color: #7a82a0; border-bottom: 1px solid #dde1e9; padding-bottom: 3px; margin-bottom: 4px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .field { background: #f7f8fa; border: 1px solid #dde1e9; border-radius: 5px; padding: 5px 8px; }
  .field-label { font-size: 9px; color: #7a82a0; margin-bottom: 1px; }
  .field-value { font-size: 11px; font-weight: 600; color: #1a1f2e; }
  .risk-badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px;
    font-weight: 700; border: 1.5px solid; }
  .extremo { background: #fff0f0; color: #c00000; border-color: #fca5a5; }
  .alto { background: #fff7ed; color: #e06000; border-color: #fdba74; }
  .medio { background: #fefce8; color: #b8860b; border-color: #fde047; }
  .bajo { background: #f0fdf4; color: #375623; border-color: #86efac; }
  .textarea-field { background: #f7f8fa; border: 1px solid #dde1e9; border-radius: 5px;
    padding: 5px 8px; font-size: 10px; color: #1a1f2e; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #eef1f5; padding: 5px 8px; text-align: left; font-size: 9px;
    font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #7a82a0;
    border-bottom: 2px solid #dde1e9; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  .footer { margin-top: 8mm; font-size: 9px; color: #9ca3af; border-top: 1px solid #eee; padding-top: 4px; }
  @media print { @page { size: A4; margin: 10mm 12mm; } }
</style></head><body>
<h1>Clasificación SMS — Sistema de Gestión de Seguridad</h1>
<div class="sub">Generado el ${new Date().toLocaleString('es-CO')} · Resultado orientativo</div>

${contextFile ? `<div class="section">
<div class="section-title">Datos del reporte cargado</div>
<div class="grid2">
  ${['ID','Flota','Area_Generadora','Tipo Reporte','Fecha Evento'].filter(k => contextFile[k]).map(k =>
    `<div class="field"><div class="field-label">${k}</div><div class="field-value">${contextFile[k]}</div></div>`
  ).join('')}
</div></div>` : ''}

<div class="section">
<div class="section-title">Descripción del evento</div>
<div class="textarea-field">${descripcion}</div>
</div>

${causa ? `<div class="section">
<div class="section-title">Causa probable</div>
<div class="textarea-field">${causa}</div>
</div>` : ''}

<div class="section">
<div class="section-title">Clasificación SMS</div>
<div class="grid2">
  <div class="field"><div class="field-label">Tipo de Reporte</div><div class="field-value">${result.tipo_reporte || '—'}</div></div>
  <div class="field"><div class="field-label">Peligro Genérico</div><div class="field-value">${result.peligro_generico || '—'}</div></div>
  <div class="field"><div class="field-label">ATA 100</div><div class="field-value">${result.ata_100 ? `${result.ata_100} — ${result.ata_sign}` : '—'}</div></div>
  <div class="field"><div class="field-label">Indicadores SPI</div><div class="field-value">${result.indicadores_spi || '—'}</div></div>
  <div class="field"><div class="field-label">Severidad</div><div class="field-value" style="color:${SEV_COLORS[result.severity_c] ?? '#374151'}">${result.severity_c || '—'}</div></div>
  <div class="field"><div class="field-label">Probabilidad (Likelyhood)</div><div class="field-value">${result.likelyhood || '—'}</div></div>
  <div class="field"><div class="field-label">Índice de Riesgo (UR)</div><div class="field-value" style="font-size:18px;">${result.risk_ind}</div></div>
  <div class="field"><div class="field-label">Nivel de Riesgo (ALARP)</div><div class="field-value">
    <span class="risk-badge ${(result.risk_alarp || '').toLowerCase()}">${result.risk_alarp || '—'}</span>
  </div></div>
</div>
${result.descriptor_codigo ? `<div style="margin-top:6px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:5px;padding:5px 8px;">
<div class="field-label" style="color:#0d9488;margin-bottom:3px;">Descriptor SRVSOP</div>
<span style="display:inline-block;background:#0d9488;color:#fff;font-family:monospace;font-size:10px;font-weight:700;padding:1px 7px;border-radius:3px;margin-right:6px;">${result.descriptor_codigo}</span>
${result.descriptor_subcat ? `<span style="font-size:9px;color:#0d9488;">${result.descriptor_subcat}</span>` : ''}
${result.descriptor_descripcion ? `<div style="margin-top:3px;font-size:10px;color:#134e4a;">${result.descriptor_descripcion}</div>` : ''}
</div>` : ''}
</div></div>

${result.severity_pcrp ? `<div class="section">
<div class="section-title">Severidad PCRP por criterio</div>
<div class="grid2">
  ${Object.entries(result.severity_pcrp).filter(([k]) => k !== 'peor').map(([k, v]) =>
    `<div class="field"><div class="field-label">${k.charAt(0).toUpperCase() + k.slice(1)}</div>
    <div class="field-value" style="color:${SEV_COLORS[v as string] ?? '#374151'}">${v as string}</div></div>`
  ).join('')}
</div></div>` : ''}

${barriers.length ? `<div class="section">
<div class="section-title">Defensas / Barreras ARMS (${barriers.length})</div>
<table><thead><tr><th>Barrera</th><th>Tipo</th><th>Efectividad</th></tr></thead><tbody>
  ${barriers.map(b => {
    const eff = EFF_OPTS.find(e => e.key === b.efectividad)
    return `<tr>
      <td>${b.nombre}</td>
      <td>${TIPO_OPTS[b.tipo] || b.tipo}</td>
      <td style="color:${eff ? eff.color : '#9ca3af'};font-weight:600">${eff ? eff.label : 'Sin evaluar'}</td>
    </tr>`
  }).join('')}
</tbody></table>
${globalEff !== null ? `<div style="margin-top:5px;font-size:10px;color:#7a82a0;">
Efectividad global: <strong>${globalEff}%</strong> → Probabilidad sugerida: <strong>${effToLikelyhood(globalEff)}</strong>
</div>` : ''}</div>` : ''}

${result.justificacion_severidad || result.justificacion_probabilidad ? `<div class="section">
<div class="section-title">Justificación de la valoración</div>
${result.justificacion_severidad ? `<div style="margin-bottom:4px;"><div class="field-label" style="margin-bottom:2px;">Severidad:</div><div class="textarea-field">${result.justificacion_severidad}</div></div>` : ''}
${result.justificacion_probabilidad ? `<div><div class="field-label" style="margin-bottom:2px;">Probabilidad:</div><div class="textarea-field">${result.justificacion_probabilidad}</div></div>` : ''}
</div>` : ''}

${result.area_gestora || result.plan_gestion ? `<div class="section">
<div class="section-title">Análisis y gestión</div>
${result.area_gestora ? `<div class="field" style="margin-bottom:4px;"><div class="field-label">Área gestora sugerida</div>
<div class="field-value" style="color:#6d28d9">${result.area_gestora}${result.responsable_sugerido ? ` · ${result.responsable_sugerido}` : ''}</div></div>` : ''}
${result.plan_gestion ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:6px 8px;">
<div class="field-label" style="margin-bottom:3px;">Plan de gestión orientativo:</div>
${result.plan_gestion.split('\n').map(l => `<div style="font-size:10px;margin-bottom:2px;">${l}</div>`).join('')}
</div>` : ''}
</div>` : ''}

<div class="footer">
  Método: ${methodLabel[result.method] || result.method} · Confianza: ${Math.round(result.confidence * 100)}% ·
  ⚠️ Resultado orientativo. Verificar con supervisor antes de registrar oficialmente.
</div>
</body></html>`

  const w = window.open('', '_blank', 'width=800,height=900')
  if (!w) return
  w.document.write(html)
  w.document.close()
  setTimeout(() => w.print(), 400)
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
export default function ClassifierForm() {
  /* ── Form state ─────────────────────────────────────────── */
  const [descripcion, setDescripcion] = useState('')
  const [causa, setCausa]             = useState('')
  const [contextFile, setContextFile] = useState<Record<string, string> | null>(null)
  const [barriers, setBarriers]       = useState<Barrier[]>([])
  const [bSeq, setBSeq]               = useState(0)
  const [bName, setBName]             = useState('')
  const [bType, setBType]             = useState<'T'|'R'|'E'|'O'>('T')
  const fileRef = useRef<HTMLInputElement>(null)

  /* ── Result & UI ────────────────────────────────────────── */
  const [result, setResult]           = useState<ClassificationResult | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [activeTab, setActiveTab]     = useState<'clasificacion' | 'analisis'>('clasificacion')

  /* ── Historial ──────────────────────────────────────────── */
  const [historial, setHistorial]     = useState<HistEntry[]>([])
  const [showHist, setShowHist]       = useState(false)

  /* ── Feedback ───────────────────────────────────────────── */
  const [feedback, setFeedback]       = useState<'ok' | 'ko' | null>(null)
  const [showFbModal, setShowFbModal] = useState(false)
  const [fbField, setFbField]         = useState('severity_c')
  const [fbCorrect, setFbCorrect]     = useState('')

  /* ── Suggested barriers panel ───────────────────────────── */
  const [showSuggestions, setShowSuggestions] = useState(true)

  /* Load historial from localStorage on mount */
  useEffect(() => { setHistorial(loadHistorial()) }, [])

  /* ── File upload ─────────────────────────────────────────── */
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
        const desc = record['Descripción del Evento'] || record['descripcion'] || record['description'] || ''
        const ca   = record['Causa Probable'] || record['causa'] || record['cause'] || ''
        if (desc) setDescripcion(desc)
        if (ca)   setCausa(ca)
      } catch { setError('No se pudo leer el archivo. Asegúrese de que sea JSON o CSV válido.') }
    }
    reader.readAsText(file)
  }

  /* ── Barriers ───────────────────────────────────────────── */
  function addBarrier() {
    if (!bName.trim()) return
    const id = bSeq + 1; setBSeq(id)
    setBarriers(prev => [...prev, { id, nombre: bName.trim(), tipo: bType, efectividad: -1 }])
    setBName('')
  }
  function setEff(id: number, eff: number) {
    setBarriers(prev => prev.map(b => b.id === id ? { ...b, efectividad: b.efectividad === eff ? -1 : eff } : b))
  }
  function removeBarrier(id: number) { setBarriers(prev => prev.filter(b => b.id !== id)) }

  function isSuggestionAdded(nombre: string) {
    return barriers.some(b => b.nombre === nombre)
  }
  function addSuggestion(s: BarrierSuggestion) {
    if (isSuggestionAdded(s.nombre)) return
    const id = bSeq + 1; setBSeq(id)
    setBarriers(prev => [...prev, { id, nombre: s.nombre, tipo: s.tipo as 'T'|'R'|'E'|'O', efectividad: -1 }])
  }

  const globalEff = calcGlobalEff(barriers)
  const suggestedLikelyhood = globalEff !== null ? effToLikelyhood(globalEff) : null
  const suggestedBarriers: BarrierSuggestion[] = result
    ? (BARRIER_SUGGESTIONS[result.peligro_generico] ?? [])
    : []

  /* ── Classify ───────────────────────────────────────────── */
  async function handleClassify(e: React.FormEvent) {
    e.preventDefault()
    if (descripcion.trim().length < 20) { setError('La descripción debe tener al menos 20 caracteres'); return }
    setLoading(true); setError(''); setResult(null); setFeedback(null)
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion, causa, barriers }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const r: ClassificationResult = data.result
      setResult(r)
      setActiveTab('clasificacion')
      setShowSuggestions(true)
      // Save to historial
      const entry: HistEntry = {
        id: Date.now().toString(),
        ts: Date.now(),
        descripcion_preview: descripcion.substring(0, 80),
        risk_alarp: r.risk_alarp,
        risk_ind: r.risk_ind,
        severity_c: r.severity_c,
        likelyhood: r.likelyhood,
        barriers_count: barriers.length,
        result: r,
      }
      const hist = [entry, ...loadHistorial()].slice(0, MAX_HIST)
      saveHistorial(hist)
      setHistorial(hist)
    } catch { setError('Error al conectar con el servidor. Intenta nuevamente.') }
    setLoading(false)
  }

  /* ── Nueva clasificación ─────────────────────────────────── */
  function nuevaClasificacion() {
    setResult(null)
    setDescripcion('')
    setCausa('')
    setContextFile(null)
    setBarriers([])
    setBSeq(0)
    setFeedback(null)
    setError('')
    setActiveTab('clasificacion')
    if (fileRef.current) fileRef.current.value = ''
  }

  /* ── Restore from historial ─────────────────────────────── */
  function restoreFromHist(entry: HistEntry) {
    setResult(entry.result)
    setActiveTab('clasificacion')
    setShowHist(false)
    setFeedback(null)
  }

  /* ── Feedback submit ────────────────────────────────────── */
  function submitFeedback() {
    // Save correction to localStorage for future use
    const corrections = JSON.parse(localStorage.getItem('sms_oma_corrections') ?? '[]')
    corrections.push({
      ts: Date.now(),
      field: fbField,
      correct: fbCorrect,
      original: result,
      descripcion_preview: descripcion.substring(0, 80),
    })
    localStorage.setItem('sms_oma_corrections', JSON.stringify(corrections.slice(0, 50)))
    setShowFbModal(false)
    setFeedback('ok')
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Historial drawer toggle */}
      {historial.length > 0 && (
        <div className="card overflow-hidden">
          <button
            onClick={() => setShowHist(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
              </svg>
              Historial de clasificaciones ({historial.length})
            </span>
            <svg className={`w-4 h-4 transition-transform ${showHist ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7"/>
            </svg>
          </button>
          {showHist && (
            <div className="border-t border-gray-100 divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {historial.map(entry => (
                <button key={entry.id} onClick={() => restoreFromHist(entry)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate font-medium">{entry.descripcion_preview}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(entry.ts).toLocaleString('es-CO', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                      {' · '}{entry.severity_c} · {entry.likelyhood}
                      {entry.barriers_count > 0 && ` · ${entry.barriers_count} barrera(s)`}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border
                    ${RISK_BG[entry.risk_alarp] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {entry.risk_alarp || '—'}
                  </span>
                </button>
              ))}
              <div className="px-4 py-2 flex justify-end">
                <button onClick={() => { saveHistorial([]); setHistorial([]); setShowHist(false) }}
                  className="text-[10px] text-red-400 hover:text-red-600 transition">
                  Limpiar historial
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
                  placeholder="Describe detalladamente el evento, falla, condición o situación de seguridad observada..."/>
                <p className="text-xs text-gray-400 mt-0.5">{descripcion.length} caracteres</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Causa Probable</label>
                <textarea value={causa} onChange={e => setCausa(e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Causa probable o raíz del evento..."/>
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
                className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"/>
              <select value={bType} onChange={e => setBType(e.target.value as 'T'|'R'|'E'|'O')}
                className="px-2 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
                {Object.entries(TIPO_OPTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button type="button" onClick={addBarrier}
                className="px-3 py-2 bg-brand-700 text-white text-xs font-semibold rounded-lg hover:bg-brand-600 transition">
                + Agregar
              </button>
            </div>
            <div className="space-y-1.5 mb-3">
              {!barriers.length && <p className="text-xs text-gray-400 italic py-1">Sin barreras registradas.</p>}
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
            {globalEff !== null && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs">
                <span className="font-semibold text-yellow-800">Efectividad global: {globalEff}%</span>
                {' → '}
                <span className="font-bold text-yellow-900">Probabilidad sugerida: {suggestedLikelyhood}</span>
                <span className="text-yellow-700 ml-1">({PROB_EFFECTIVE[suggestedLikelyhood ?? ''] ?? ''})</span>
              </div>
            )}

            {/* ── Suggested barriers from BBDD analysis ── */}
            {suggestedBarriers.length > 0 && (
              <div className="border border-teal-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSuggestions(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-teal-50 hover:bg-teal-100 transition-colors"
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
                    </svg>
                    Barreras sugeridas
                    <span className="bg-teal-200 text-teal-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {suggestedBarriers.length}
                    </span>
                    <span className="text-teal-500 font-normal truncate max-w-[120px]">
                      · {result?.peligro_generico?.split(' - ')[0]}
                    </span>
                  </span>
                  <svg className={`w-3.5 h-3.5 text-teal-600 transition-transform shrink-0 ${showSuggestions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7"/>
                  </svg>
                </button>
                {showSuggestions && (
                  <div className="divide-y divide-teal-100 max-h-60 overflow-y-auto">
                    <p className="px-3 py-1.5 text-[9px] text-teal-600 bg-teal-50/60 border-b border-teal-100">
                      Haz clic en <strong>+</strong> para agregar la barrera a tu lista de defensas vigentes
                    </p>
                    {suggestedBarriers.map(s => {
                      const added = isSuggestionAdded(s.nombre)
                      const tc = SUGG_TIPO_CLS[s.tipo] ?? SUGG_TIPO_CLS.O
                      return (
                        <div key={s.id} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 transition-colors">
                          <span className={`shrink-0 mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${tc}`}>
                            {s.tipo}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 leading-tight">{s.nombre}</p>
                            <p className="text-[9px] text-gray-400 mt-0.5 leading-tight" title={s.ref}>{s.ref}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addSuggestion(s)}
                            disabled={added}
                            title={added ? 'Ya agregada a mis defensas' : 'Agregar a mis defensas vigentes'}
                            className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full border font-bold text-sm transition-colors ${
                              added
                                ? 'bg-green-50 border-green-300 text-green-600 cursor-default'
                                : 'bg-white border-gray-300 text-gray-500 hover:border-brand-500 hover:text-brand-700 hover:bg-brand-50'
                            }`}
                          >
                            {added ? '✓' : '+'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL — Result ═══ */}
        <div className="card flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 shrink-0 items-stretch">
            {result ? (
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
                {/* Nueva Clasificación */}
                <button
                  onClick={nuevaClasificacion}
                  title="Limpiar todo e iniciar nueva clasificación"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 mx-2 my-1.5 text-[11px] font-semibold text-white bg-brand-700 hover:bg-brand-600 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                  </svg>
                  Nueva clasificación
                </button>
              </>
            ) : (
              <div className="flex-1 py-3 text-center text-xs font-semibold text-gray-500">Resultado</div>
            )}
          </div>

          {/* Empty state */}
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center flex-1 h-80 text-gray-300">
              <svg className="w-14 h-14 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/>
              </svg>
              <p className="text-sm">Ingresa un evento y presiona Clasificar</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center flex-1 h-80 text-gray-400">
              <svg className="animate-spin w-10 h-10 mb-3 text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-sm">Analizando el reporte...</p>
            </div>
          )}

          {/* Clasificación tab */}
          {result && activeTab === 'clasificacion' && (
            <div className="p-4 space-y-3 overflow-y-auto">
              {/* Method + PDF export */}
              <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                <span>{methodLabel[result.method]}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-brand-700">{Math.round(result.confidence * 100)}% confianza</span>
                  <button
                    onClick={() => exportPDF(result, descripcion, causa, barriers, contextFile)}
                    className="flex items-center gap-1 text-[10px] font-semibold bg-brand-700 text-white px-2 py-1 rounded-md hover:bg-brand-600 transition">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/>
                    </svg>
                    PDF
                  </button>
                </div>
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

              {/* SRVSOP Descriptor */}
              {result.descriptor_codigo && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-teal-600 mb-1.5">Descriptor SRVSOP</p>
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 font-mono text-xs font-bold text-white bg-teal-600 px-2 py-0.5 rounded">
                      {result.descriptor_codigo}
                    </span>
                    <div>
                      {result.descriptor_subcat && (
                        <p className="text-[10px] text-teal-500 font-medium leading-tight">{result.descriptor_subcat}</p>
                      )}
                      {result.descriptor_descripcion && (
                        <p className="text-xs text-teal-800 mt-0.5 leading-snug">{result.descriptor_descripcion}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

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

              {result.efectividad_global !== undefined && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs">
                  <p className="font-semibold text-yellow-800">
                    Efectividad barreras: {result.efectividad_global}%
                    {result.likelyhood_from_barriers && ` → Likelyhood por barreras: ${result.likelyhood_from_barriers}`}
                  </p>
                </div>
              )}

              {result.severity_pcrp && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Severidad PCRP por criterio</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                    {Object.entries(result.severity_pcrp).filter(([k]) => k !== 'peor').map(([k, v]) => (
                      <p key={k}><span className="text-gray-400 capitalize">{k}: </span>
                        <span className="font-semibold" style={{ color: SEV_COLORS[v as string] ?? '#374151' }}>{v as string}</span></p>
                    ))}
                  </div>
                  <p className="text-xs font-bold mt-1" style={{ color: SEV_COLORS[result.severity_pcrp.peor] ?? '#374151' }}>
                    Peor condición: {result.severity_pcrp.peor}
                  </p>
                </div>
              )}

              {/* Feedback */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 mb-1.5">¿El resultado es correcto?</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setFeedback('ok')}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition ${feedback === 'ok' ? 'bg-green-50 border-green-300 text-green-700 font-semibold' : 'border-gray-200 text-gray-500 hover:border-green-300'}`}>
                    👍 Correcto
                  </button>
                  <button onClick={() => { setFeedback('ko'); setShowFbModal(true); setFbCorrect('') }}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition ${feedback === 'ko' ? 'bg-red-50 border-red-300 text-red-700 font-semibold' : 'border-gray-200 text-gray-500 hover:border-red-300'}`}>
                    👎 Corregir
                  </button>
                  {feedback === 'ok' && <span className="text-xs text-green-600">¡Gracias por la confirmación!</span>}
                </div>
              </div>

              <p className="text-xs text-gray-400">
                ⚠️ Resultado orientativo. Verificar con supervisor antes de registrar oficialmente.
              </p>
            </div>
          )}

          {/* Análisis tab */}
          {result && activeTab === 'analisis' && (
            <div className="p-4 space-y-4 overflow-y-auto">
              {result.justificacion_severidad && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Justificación de Severidad</p>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 text-xs text-gray-700 leading-relaxed">
                    {result.justificacion_severidad}
                  </div>
                </div>
              )}
              {result.justificacion_probabilidad && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Justificación de Probabilidad</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-gray-700 leading-relaxed">
                    {result.justificacion_probabilidad}
                  </div>
                </div>
              )}
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
              {/* PDF from analysis tab */}
              {result && (
                <button
                  onClick={() => exportPDF(result, descripcion, causa, barriers, contextFile)}
                  className="w-full flex items-center justify-center gap-2 text-xs font-semibold bg-brand-700 text-white px-3 py-2 rounded-lg hover:bg-brand-600 transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/>
                  </svg>
                  Exportar informe completo PDF
                </button>
              )}
              <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                ⚠️ Orientativo — la gestión definitiva debe ser validada por el Jefe SMS.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Feedback Modal ═══ */}
      {showFbModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-1">Corregir clasificación</h3>
            <p className="text-xs text-gray-500 mb-4">
              Indica qué campo no es correcto y cuál debería ser el valor. Esto mejora el modelo.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Campo incorrecto</label>
                <select value={fbField} onChange={e => setFbField(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="severity_c">Severidad — {result.severity_c}</option>
                  <option value="likelyhood">Probabilidad — {result.likelyhood}</option>
                  <option value="risk_alarp">Nivel de riesgo — {result.risk_alarp}</option>
                  <option value="tipo_reporte">Tipo de reporte — {result.tipo_reporte}</option>
                  <option value="peligro_generico">Peligro genérico — {result.peligro_generico}</option>
                  <option value="ata_100">ATA 100 — {result.ata_100}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor correcto</label>
                <input type="text" value={fbCorrect} onChange={e => setFbCorrect(e.target.value)}
                  placeholder="Ingresa el valor correcto..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowFbModal(false); setFeedback(null) }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={submitFeedback} disabled={!fbCorrect.trim()}
                className="flex-1 px-4 py-2 bg-brand-700 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition disabled:opacity-50">
                Enviar corrección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
