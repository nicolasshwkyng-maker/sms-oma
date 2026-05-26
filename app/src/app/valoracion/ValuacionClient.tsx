'use client'
import { useState, useCallback } from 'react'

/* ── Data ───────────────────────────────────────────────────────────────────── */
const SEVERITIES = [
  { s: 5, name: 'Catastrófico', color: '#c00000', bg: '#fff0f0', hi: '#ffd6d6', t: '#8b0000', emoji: '💀' },
  { s: 4, name: 'Peligroso',    color: '#e06000', bg: '#fff5eb', hi: '#ffddb8', t: '#b84d00', emoji: '⚠️' },
  { s: 3, name: 'Importante',   color: '#c89600', bg: '#fffbe6', hi: '#fff0b0', t: '#9a7200', emoji: '🔶' },
  { s: 2, name: 'Leve',         color: '#00897b', bg: '#edfaf8', hi: '#c8f5ef', t: '#006b61', emoji: '🔵' },
  { s: 1, name: 'Insignificante',color:'#2f6de0', bg: '#eef3ff', hi: '#d4e4ff', t: '#1d4fbf', emoji: '✅' },
]
const SEV_FACTOR: Record<number, number> = { 5: 500, 4: 250, 3: 100, 2: 50, 1: 0.2 }

const CRITERIA = [
  { id: 'aeronave',  icon: '✈️', name: 'Aeronave / Equipo', hint: 'Aeronavegabilidad', cells: [
    'Daños estructurales mayores / emergencia en vuelo / aeronave no recuperable.',
    'Daños estructurales significativos que requieren reparación mayor / retorno de vuelo.',
    'Activación inadvertida de sistemas / retrasos relevantes / trabajo de pernocta.',
    'Desviaciones menores que generan retrabajo / defecto resuelto en tránsito.',
    'Eventos sin impacto en la operación ni en la aeronavegabilidad.',
  ]},
  { id: 'personas',  icon: '👤', name: 'Personas', hint: 'Seguridad del personal', cells: [
    'Lesiones mortales o lesiones graves múltiples.',
    'Lesiones graves que requieren hospitalización.',
    'Lesiones leves que requieren evaluación médica sin hospitalización.',
    'Sin lesiones; puede requerir verificación preventiva del estado del personal.',
    'Susto del personal, sin lesiones.',
  ]},
  { id: 'regulacion',icon: '📋', name: 'Regulación', hint: 'Cumplimiento normativo', cells: [
    'Incumplimiento de regulación externa/interna que afecta la seguridad operacional.',
    'Incumplimiento regulatorio con impacto potencial en la seguridad operacional.',
    'Incumplimiento de procedimientos sin impacto directo en la seguridad.',
    'Desviaciones a procedimientos internos sin constituir incumplimiento regulatorio.',
    'Sin incumplimiento de regulaciones externas o internas.',
  ]},
  { id: 'reputacion',icon: '🏛️', name: 'Reputación', hint: 'Imagen institucional', cells: [
    'Afectación grave a la imagen de la empresa a nivel internacional.',
    'Afectación a la imagen de la empresa a nivel nacional.',
    'Afectación a la imagen de la empresa a nivel local o interno.',
    'Afectación limitada a nivel de departamento, turno o área.',
    'Sin afectación a la imagen de la empresa.',
  ]},
  { id: 'ambiente',  icon: '🌿', name: 'Medio Ambiente', hint: 'Impacto ambiental', cells: [
    'Impacto ambiental masivo que se extiende más allá de 5 millas del lugar.',
    'Impacto ambiental mayor que se extiende más allá del lugar del incidente.',
    'Impacto ambiental menor, localizado en el lugar del incidente.',
    'Impacto ambiental menor, fácilmente controlable en el área de trabajo.',
    'Efecto localizado o sin impacto ambiental apreciable.',
  ]},
]

const PROBABILITIES = [
  { pid: 'SI', factor: 0.2, label: '0,2', name: 'Sumamente improbable', eff: '100%', color: '#2563eb', bg: '#eff6ff' },
  { pid: 'I',  factor: 0.5, label: '0,5', name: 'Improbable',           eff: '80%',  color: '#16a34a', bg: '#f0fdf4' },
  { pid: 'O',  factor: 1,   label: '1',   name: 'Ocasional',            eff: '50%',  color: '#ca8a04', bg: '#fefce8' },
  { pid: 'P',  factor: 3,   label: '3',   name: 'Probable',             eff: '20%',  color: '#ea580c', bg: '#fff7ed' },
  { pid: 'F',  factor: 5,   label: '5',   name: 'Frecuente',            eff: '0%',   color: '#dc2626', bg: '#fef2f2' },
]

const EFF_LEVELS = [
  { key: 100, label: '100%', color: '#2563eb', bg: '#eff6ff' },
  { key: 80,  label: '80%',  color: '#16a34a', bg: '#f0fdf4' },
  { key: 50,  label: '50%',  color: '#ca8a04', bg: '#fefce8' },
  { key: 20,  label: '20%',  color: '#ea580c', bg: '#fff7ed' },
  { key: 0,   label: '0%',   color: '#dc2626', bg: '#fef2f2' },
]

const UR_MATRIX: Record<number, Record<string, number>> = {
  5: { SI: 101, I: 252, O: 501, P: 1500, F: 2500 },
  4: { SI: 52,  I: 125, O: 251, P: 750,  F: 1250 },
  3: { SI: 20,  I: 51,  O: 100, P: 300,  F: 500  },
  2: { SI: 10,  I: 25,  O: 50,  P: 150,  F: 250  },
  1: { SI: 0.04,I: 0.1, O: 0.2, P: 0.6, F: 1    },
}

const TOLERABILITY = [
  { name: 'Extremo', min: 500, alarp: 'Riesgo Extremo', time: '< 2 días',   desc: 'Riesgo inaceptable. Requiere mitigación inmediata o suspensión de la actividad.', color: '#c00000', bg: '#fff0f0', border: '#fca5a5' },
  { name: 'Alto',    min: 250, alarp: 'Riesgo Alto',    time: '≤ 20 días',  desc: 'Riesgo tolerable únicamente con mitigación prioritaria. Deben generarse y verificarse controles.', color: '#e06000', bg: '#fff7ed', border: '#fdba74' },
  { name: 'Medio',   min: 20,  alarp: 'Riesgo Medio',   time: '≤ 40 días',  desc: 'Riesgo aceptable condicionado a mitigación. Requiere seguimiento continuo.', color: '#b8860b', bg: '#fefce8', border: '#fde047' },
  { name: 'Bajo',    min: 0,   alarp: 'Riesgo Bajo',    time: '≤ 60 días',  desc: 'Riesgo aceptable y deseable. Solo monitoreo rutinario.', color: '#375623', bg: '#f0fdf4', border: '#86efac' },
]

function getTol(ur: number) { return TOLERABILITY.find(t => ur >= t.min) ?? TOLERABILITY[TOLERABILITY.length - 1] }
function urZoneClass(ur: number) {
  if (ur >= 500) return 'bg-red-200 text-red-900 font-bold'
  if (ur >= 250) return 'bg-orange-200 text-orange-900 font-bold'
  if (ur >= 20)  return 'bg-yellow-200 text-yellow-900 font-bold'
  return 'bg-green-200 text-green-900 font-bold'
}

interface LocalBarrier { id: number; nombre: string; tipo: string; eff: number | null }

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function ValuacionClient() {
  // Step
  const [step, setStep] = useState(1)

  // Identifier
  const [evalId, setEvalId]   = useState('')
  const [hallType, setHall]   = useState<'NC' | 'OBS' | ''>('')
  const [hallDesc, setHallDesc] = useState('')

  // Severity
  const [sevSel, setSevSel]   = useState<Record<string, number | null>>(Object.fromEntries(CRITERIA.map(c => [c.id, null])))
  const [sevConf, setSevConf] = useState<number | null>(null)

  // Barriers
  const [bName, setBName]   = useState('')
  const [bType, setBType]   = useState('T')
  const [barriers, setBarriers] = useState<LocalBarrier[]>([])
  const [bSeq, setBSeq]     = useState(0)

  // Probability
  const [prob, setProb]     = useState<typeof PROBABILITIES[0] | null>(null)

  function selectSev(critId: string, s: number) {
    setSevSel(prev => ({ ...prev, [critId]: prev[critId] === s ? null : s }))
    setSevConf(null)
  }

  function addBarrier() {
    if (!bName.trim()) return
    setBarriers(prev => [...prev, { id: bSeq + 1, nombre: bName.trim(), tipo: bType, eff: null }])
    setBSeq(n => n + 1)
    setBName('')
  }

  function setBarrierEff(id: number, eff: number) {
    setBarriers(prev => prev.map(b => b.id === id ? { ...b, eff: b.eff === eff ? null : eff } : b))
  }

  function removeBarrier(id: number) {
    setBarriers(prev => prev.filter(b => b.id !== id))
  }

  // Global effectiveness
  const evalBarriers = barriers.filter(b => b.eff !== null)
  const globalEff = evalBarriers.length
    ? Math.round(evalBarriers.reduce((s, b) => s + (b.eff ?? 0), 0) / evalBarriers.length)
    : null

  function effToPid(pct: number): string {
    if (pct >= 90) return 'SI'
    if (pct >= 65) return 'I'
    if (pct >= 35) return 'O'
    if (pct >= 10) return 'P'
    return 'F'
  }
  const suggestedPid = globalEff !== null ? effToPid(globalEff) : null
  const suggestedProb = suggestedPid ? PROBABILITIES.find(p => p.pid === suggestedPid) : null

  // Worst sev
  const sevVals = Object.values(sevSel).filter(v => v !== null) as number[]
  const worstSev = sevVals.length ? Math.max(...sevVals) : null
  const avgSev   = sevVals.length ? sevVals.reduce((a, b) => a + b, 0) / sevVals.length : null
  const suggestedSev = avgSev !== null ? Math.round(avgSev) : null

  // Risk result
  const UR = sevConf && prob ? UR_MATRIX[sevConf][prob.pid] : null
  const tol = UR !== null ? getTol(UR) : null

  function reset() {
    setStep(1); setEvalId(''); setHall(''); setHallDesc('')
    setSevSel(Object.fromEntries(CRITERIA.map(c => [c.id, null])))
    setSevConf(null); setBarriers([]); setBSeq(0); setProb(null)
  }

  /* ── Step 1 — Severidad ────────────────────────────────────────────────── */
  function renderStep1() {
    return (
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Clasificación de Severidad (PCRP)</h2>
          <span className="text-xs border border-gray-200 rounded px-2 py-0.5 text-gray-500">
            {sevConf ? `${SEVERITIES.find(s=>s.s===sevConf)?.name} (Factor ${SEV_FACTOR[sevConf]})` : 'Sin confirmar'}
          </span>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th className="w-36 bg-gray-50 border-b-2 border-r-2 border-gray-200 p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Severidad ↓ / Criterio →
                </th>
                {CRITERIA.map(c => (
                  <th key={c.id} className="border-b-2 border-r border-gray-200 last:border-r-0 bg-gray-50 p-2 text-center align-bottom">
                    <div className="text-base">{c.icon}</div>
                    <div className="text-xs font-semibold text-gray-700 leading-tight mt-0.5">{c.name}</div>
                    <div className="text-[9px] text-gray-400">{c.hint}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SEVERITIES.map((sev, si) => (
                <tr key={sev.s} className="border-b border-gray-100 last:border-b-0">
                  <td className="border-r-2 border-gray-200 p-2 align-middle" style={{ background: sev.bg }}>
                    <div className="text-sm">{sev.emoji}</div>
                    <div className="text-[9px] font-mono text-gray-400">Factor {SEV_FACTOR[sev.s]}</div>
                    <div className="text-xs font-bold" style={{ color: sev.t }}>{sev.name}</div>
                  </td>
                  {CRITERIA.map(crit => {
                    const isSel = sevSel[crit.id] === sev.s
                    return (
                      <td
                        key={crit.id}
                        onClick={() => selectSev(crit.id, sev.s)}
                        className="border-r border-gray-100 last:border-r-0 p-0 cursor-pointer relative"
                      >
                        <div
                          className="p-2 min-h-[68px] flex flex-col gap-1 transition-colors"
                          style={{ background: isSel ? sev.hi : undefined }}
                        >
                          {isSel && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                              style={{ background: sev.color }}>
                              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="1,4 3.5,6.5 9,1"/></svg>
                            </span>
                          )}
                          <p className="text-[10px] leading-snug" style={{ color: isSel ? sev.t : '#6b7280', fontWeight: isSel ? 600 : 400 }}>
                            {crit.cells[si]}
                          </p>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Result bar */}
        {sevVals.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex flex-wrap gap-6 items-start">
              {/* Bars */}
              <div className="flex-1 min-w-[200px]">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Detalle por criterio</p>
                {CRITERIA.map(crit => {
                  const v = sevSel[crit.id]
                  const sev = v ? SEVERITIES.find(s => s.s === v) : null
                  return (
                    <div key={crit.id} className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-gray-500 w-24 truncate">{crit.icon} {crit.name.split('/')[0].trim()}</span>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: v ? `${(v/5)*100}%` : '0%', background: sev?.color ?? '#ddd' }} />
                      </div>
                      <span className="text-[10px] font-mono w-4 text-right" style={{ color: sev?.t ?? '#9ca3af' }}>{v ?? '—'}</span>
                    </div>
                  )
                })}
                {worstSev && avgSev && (
                  <p className="text-[9px] text-gray-400 mt-1">
                    Peor caso: <strong>{SEVERITIES.find(s=>s.s===worstSev)?.name}</strong> · Promedio: {avgSev.toFixed(1)} → sugerido: <strong>{SEVERITIES.find(s=>s.s===suggestedSev)?.name}</strong>
                  </p>
                )}
              </div>
              {/* Confirm tiles */}
              <div className="flex-1 min-w-[260px]">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Confirme el nivel de severidad</p>
                <div className="flex gap-1.5 flex-wrap">
                  {SEVERITIES.map(sev => {
                    const isSugg = sev.s === suggestedSev
                    const isConf = sev.s === sevConf
                    return (
                      <button
                        key={sev.s}
                        onClick={() => setSevConf(prev => prev === sev.s ? null : sev.s)}
                        className="flex flex-col items-center px-2 py-1.5 rounded-lg border-2 transition-all text-center min-w-[64px]"
                        style={{
                          borderColor: isConf ? sev.color : isSugg ? sev.color : '#e5e7eb',
                          borderStyle: isSugg && !isConf ? 'dashed' : 'solid',
                          background: isConf ? sev.hi : 'white',
                          boxShadow: isConf ? `0 0 0 2px ${sev.color}` : undefined,
                        }}
                      >
                        <span className="text-sm">{sev.emoji}</span>
                        <span className="text-[10px] font-bold" style={{ color: sev.t }}>{sev.name}</span>
                        <span className="text-[9px] font-mono text-gray-400">F {SEV_FACTOR[sev.s]}</span>
                        {isConf && <span className="text-[10px]" style={{ color: sev.color }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => setStep(2)}
            disabled={!sevConf}
            className="bg-brand-700 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2"
          >
            Continuar a Probabilidad <span>→</span>
          </button>
        </div>
      </div>
    )
  }

  /* ── Step 2 — Probabilidad / Barreras ──────────────────────────────────── */
  function renderStep2() {
    const TIPO_LABELS: Record<string, string> = { T: '⚙️ Tecnología', R: '📋 Reglamentación', E: '🎓 Entrenamiento', O: '🔒 Otro' }
    return (
      <div className="card">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Barreras y Probabilidad</h2>
          <span className="text-xs border border-gray-200 rounded px-2 py-0.5 text-gray-500">
            {prob ? `${prob.name} (Factor ${prob.label})` : 'Sin selección'}
          </span>
        </div>

        <div className="p-5">
          {/* Intro */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800 mb-5">
            <strong>Metodología ARMS:</strong> Liste las barreras vigentes clasificadas en T (Tecnología), R (Reglamentación) y E (Entrenamiento).
            La efectividad global calculada determina el factor de probabilidad sugerido.
          </div>

          {/* Add barrier */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <input
              type="text"
              value={bName}
              onChange={e => setBName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addBarrier()}
              placeholder="Describe la barrera o defensa..."
              className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select
              value={bType}
              onChange={e => setBType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={addBarrier} className="px-4 py-2 bg-brand-700 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition">
              + Agregar
            </button>
          </div>

          {/* Barrier list */}
          <div className="space-y-2 mb-5">
            {!barriers.length && (
              <p className="text-xs text-gray-400 italic py-2">No hay barreras registradas. Agregue al menos una.</p>
            )}
            {barriers.map(b => {
              const effLvl = b.eff !== null ? EFF_LEVELS.find(e => e.key === b.eff) : null
              const [icon] = (TIPO_LABELS[b.tipo] || '🔒').split(' ')
              return (
                <div key={b.id}
                  className="flex items-center gap-3 border rounded-lg px-3 py-2.5 transition-colors"
                  style={{ borderColor: effLvl ? effLvl.color : '#e5e7eb' }}
                >
                  <span className="text-base flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{b.nombre}</p>
                    <p className="text-[10px] text-gray-400">{TIPO_LABELS[b.tipo]}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 flex-wrap">
                    {EFF_LEVELS.map(e => (
                      <button
                        key={e.key}
                        onClick={() => setBarrierEff(b.id, e.key)}
                        className="text-[11px] font-mono px-2 py-0.5 rounded border-[1.5px] transition-all"
                        style={{
                          borderColor: b.eff === e.key ? e.color : '#e5e7eb',
                          background: b.eff === e.key ? e.bg : 'white',
                          color: b.eff === e.key ? e.color : '#6b7280',
                          fontWeight: b.eff === e.key ? 700 : 400,
                        }}
                      >{e.label}</button>
                    ))}
                  </div>
                  <button onClick={() => removeBarrier(b.id)} className="text-gray-300 hover:text-red-500 transition text-sm px-1">✕</button>
                </div>
              )
            })}
          </div>

          {/* Global effectiveness */}
          {globalEff !== null && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Efectividad global de barreras</p>
              <div className="flex gap-2 flex-wrap mb-2">
                {PROBABILITIES.map(p => {
                  const isActive = p.pid === suggestedPid
                  return (
                    <div key={p.pid}
                      className="flex flex-col items-center px-2 py-1 rounded border-[1.5px] text-center min-w-[70px] transition-all"
                      style={{
                        borderColor: isActive ? p.color : '#e5e7eb',
                        background: isActive ? p.bg : 'white',
                        boxShadow: isActive ? `0 0 0 2px ${p.color}` : undefined,
                      }}
                    >
                      <span className="text-xs font-mono font-semibold" style={{ color: isActive ? p.color : '#9ca3af' }}>{p.eff}</span>
                      <span className="text-[9px] text-gray-400">{p.name}</span>
                      {isActive && <span className="text-[9px] font-bold" style={{ color: p.color }}>▲ Sugerido</span>}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-600">
                Efectividad global: <strong className="text-base">{globalEff}%</strong>
                {' · '}{evalBarriers.length} barrera(s) evaluada(s)
              </p>
              {suggestedProb && (
                <p className="text-[10px] text-gray-500 mt-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                  💡 Efectividad {globalEff}% → Probabilidad sugerida: <strong>{suggestedProb.name} (Factor {suggestedProb.label})</strong>
                </p>
              )}
            </div>
          )}

          {/* Probability tiles */}
          <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Factor de probabilidad — confirme el nivel</p>
          <div className="grid grid-cols-5 gap-2">
            {PROBABILITIES.map(p => {
              const isSugg = p.pid === suggestedPid && (!prob || prob.pid !== p.pid)
              const isSel  = prob?.pid === p.pid
              return (
                <button
                  key={p.pid}
                  onClick={() => setProb(prev => prev?.pid === p.pid ? null : p)}
                  className="flex flex-col items-center p-2 rounded-lg border-[1.5px] text-center transition-all"
                  style={{
                    borderColor: isSel ? p.color : isSugg ? p.color : '#e5e7eb',
                    borderStyle: isSugg && !isSel ? 'dashed' : 'solid',
                    background: isSel ? p.bg : 'white',
                    boxShadow: isSel ? `0 0 0 2px ${p.color}` : undefined,
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: isSel || isSugg ? p.color : '#374151' }}>{p.name}</span>
                  <span className="text-[10px] font-mono text-gray-400 mt-0.5">Factor {p.label}</span>
                  <span className="text-[9px] text-gray-400">{p.eff} efectividad</span>
                  {isSel && <span className="text-xs mt-0.5" style={{ color: p.color }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-between">
          <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
            ← Volver
          </button>
          <button
            onClick={() => setStep(3)}
            disabled={!prob}
            className="bg-brand-700 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2"
          >
            Ver Resultado <span>→</span>
          </button>
        </div>
      </div>
    )
  }

  /* ── Step 3 — Resultado ─────────────────────────────────────────────────── */
  function renderStep3() {
    if (!sevConf || !prob || UR === null || !tol) return null
    const sev = SEVERITIES.find(s => s.s === sevConf)!
    return (
      <div className="card">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Resultado de la Valoración</h2>
          <span className="text-xs border border-gray-200 rounded px-2 py-0.5 text-gray-500">
            {evalId || 'Sin identificador'}{hallType ? ` — ${hallType}` : ''}
          </span>
        </div>

        <div className="p-5">
          {/* Top boxes */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="border-[1.5px] rounded-lg p-3" style={{ borderColor: sev.color }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Severidad</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: sev.t }}>{sev.emoji} {sev.name}</p>
              <p className="text-xs font-mono text-gray-400">Factor {SEV_FACTOR[sevConf]}</p>
            </div>
            <div className="border-[1.5px] rounded-lg p-3" style={{ borderColor: prob.color }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Probabilidad</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: prob.color }}>{prob.name}</p>
              <p className="text-xs font-mono text-gray-400">Factor {prob.label} · {prob.eff} efectividad</p>
            </div>
          </div>

          {/* Risk matrix */}
          <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Matriz de Riesgo</p>
          <div className="overflow-x-auto mb-5">
            <table className="border-collapse text-center" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th className="w-28 bg-brand-700 text-white text-[10px] font-bold p-2 border border-blue-900" rowSpan={2}>Severidad</th>
                  <th className="bg-brand-600 text-white text-xs font-bold p-1.5 border border-blue-800" colSpan={5}>Probabilidad</th>
                </tr>
                <tr>
                  {PROBABILITIES.map(p => (
                    <th key={p.pid} className="bg-brand-600 text-white text-[9px] font-bold p-1.5 border border-blue-800">
                      {p.name}<br/><span className="font-mono opacity-80">F{p.label} · {p.eff}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SEVERITIES.map(sv => (
                  <tr key={sv.s}>
                    <td className="bg-gray-50 border border-gray-300 p-1.5">
                      <div className="text-sm">{sv.emoji}</div>
                      <div className="text-[10px] font-bold" style={{ color: sv.t }}>{sv.name}</div>
                      <div className="text-[9px] font-mono text-gray-400">F{SEV_FACTOR[sv.s]}</div>
                    </td>
                    {PROBABILITIES.map(p => {
                      const ur = UR_MATRIX[sv.s][p.pid]
                      const isHl = sv.s === sevConf && p.pid === prob.pid
                      return (
                        <td key={p.pid} className={`border border-gray-300 p-0 ${urZoneClass(ur)}`}>
                          <div className={`px-2 py-2 text-[11px] font-mono ${isHl
                            ? 'w-9 h-9 rounded-full mx-auto flex items-center justify-center ring-2 ring-offset-1 ring-current text-xs font-extrabold'
                            : ''}`}>
                            {ur}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* UR Summary */}
          <div className="flex items-center gap-5 border-[1.5px] rounded-xl p-4 mb-5" style={{ borderColor: tol.color, background: tol.bg }}>
            <div className="text-center min-w-[90px]">
              <p className="text-2xl font-bold" style={{ color: tol.color }}>Riesgo {tol.name}</p>
              <p className="text-xs font-mono text-gray-500 mt-1">{UR} UR</p>
              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded border" style={{ borderColor: tol.border, color: tol.color, background: 'white' }}>{tol.alarp}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600">{tol.alarp}</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">⏱ Tiempo de gestión: {tol.time}</p>
              <p className="text-xs text-gray-600 mt-1">{tol.desc}</p>
            </div>
          </div>

          {/* Summary table */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2 border-b-2 border-gray-200 text-gray-500 uppercase text-[9px] tracking-wider">Elemento</th>
                <th className="text-left p-2 border-b-2 border-gray-200 text-gray-500 uppercase text-[9px] tracking-wider">Resultado</th>
                <th className="text-left p-2 border-b-2 border-gray-200 text-gray-500 uppercase text-[9px] tracking-wider">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Identificador', evalId || '—', hallType ? `Clasificación: ${hallType}` : ''],
                ['Severidad (PCRP)', `${sev.emoji} ${sev.name}`, `Factor ${SEV_FACTOR[sevConf]}`],
                ['Probabilidad', prob.name, `Factor ${prob.label} · ${prob.eff} efectividad barreras`],
                ['Índice de Riesgo', `${UR} UR`, tol.alarp],
                ['Tolerabilidad', tol.name, tol.desc],
                ['Tiempo de gestión', tol.time, 'Días calendario desde la fecha de evaluación'],
                ['Barreras evaluadas', `${evalBarriers.length} de ${barriers.length}`,
                  globalEff !== null ? `Efectividad global: ${globalEff}%` : 'Sin evaluación'],
                ...(hallDesc ? [['Descripción', hallDesc, '']] : []),
              ].map(([el, val, det], i) => (
                <tr key={i} className="border-b border-gray-100 last:border-b-0">
                  <td className="p-2 text-gray-500">{el}</td>
                  <td className="p-2 font-semibold text-gray-800">{val}</td>
                  <td className="p-2 text-gray-500 text-[10px]">{det}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-between">
          <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-700 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
            ← Volver
          </button>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="text-sm text-gray-600 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 13 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6.5 1v7M3.5 5l3 3 3-3M1 10v1a1 1 0 001 1h9a1 1 0 001-1v-1"/></svg>
              Exportar PDF
            </button>
            <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              Nueva evaluación
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  const stepDone = [sevConf !== null, prob !== null]
  return (
    <div className="max-w-5xl">
      {/* Identifier */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-3 flex-1 min-w-[220px]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Identificador</span>
            <input type="text" value={evalId} onChange={e => setEvalId(e.target.value)}
              placeholder="Ej: SMS-2026-045 · NC-012 · Hallazgo auditoría…"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</span>
            {(['NC', 'OBS'] as const).map(t => (
              <button key={t} onClick={() => setHall(prev => prev === t ? '' : t)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${
                  hallType === t && t === 'NC' ? 'bg-red-50 border-red-500 text-red-700' :
                  hallType === t && t === 'OBS' ? 'bg-blue-50 border-blue-500 text-blue-700' :
                  'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                {t === 'NC' ? 'No Conformidad (NC)' : 'Observación (OBS)'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-start gap-3 mt-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 pt-1.5">Descripción</span>
          <textarea value={hallDesc} onChange={e => setHallDesc(e.target.value)} rows={2}
            placeholder="Describa brevemente el hallazgo evaluado…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white mb-4">
        {[{ n: 1, label: 'Severidad' }, { n: 2, label: 'Probabilidad' }, { n: 3, label: 'Resultado' }].map(({ n, label }) => (
          <button
            key={n}
            onClick={() => {
              if (n === 1) setStep(1)
              if (n === 2 && sevConf) setStep(2)
              if (n === 3 && sevConf && prob) setStep(3)
            }}
            className={`flex-1 flex items-center gap-3 px-4 py-3 border-r last:border-r-0 border-gray-200 transition-colors ${step === n ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
              stepDone[n-1] && step !== n ? 'bg-green-500 text-white' : step === n ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {stepDone[n-1] && step !== n ? '✓' : n}
            </span>
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">Paso {n}</p>
              <p className="text-xs font-semibold">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Panels */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  )
}
