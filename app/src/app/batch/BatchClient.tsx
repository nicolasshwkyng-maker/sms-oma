'use client'
import { useState, useRef } from 'react'
import type { ClassificationResult } from '@/lib/types'
import { RISK_BG } from '@/lib/types'

interface BatchRow {
  _idx: number
  descripcion: string
  causa: string
  id?: string
  [key: string]: unknown
}

interface BatchResult {
  _idx: number
  descripcion: string
  causa: string
  id?: string
  _rawData: Record<string, unknown>
  _status: 'pending' | 'processing' | 'done' | 'error'
  _result?: ClassificationResult
  _error?: string
}

const SEV_COLORS: Record<string, string> = {
  Catastrofico: '#c00000', Peligroso: '#e06000', Importante: '#c89600',
  Leve: '#00897b', Insignificante: '#2f6de0',
}

function parseCSV(text: string): BatchRow[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map((line, i) => {
    // Handle quoted commas
    const values: string[] = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { values.push(cur); cur = '' }
      else { cur += ch }
    }
    values.push(cur)
    const row: BatchRow = { _idx: i, descripcion: '', causa: '' }
    headers.forEach((h, j) => { row[h] = (values[j] ?? '').trim() })
    row.descripcion = (row['Descripción del Evento'] || row['descripcion'] || row['description'] || '') as string
    row.causa       = (row['Causa Probable'] || row['causa'] || row['cause'] || '') as string
    row.id          = (row['ID'] || row['id'] || String(i + 1)) as string
    return row
  }).filter(r => r.descripcion)
}

function exportCSV(results: BatchResult[]) {
  const headers = ['ID', 'Descripción (preview)', 'Tipo Reporte', 'Peligro Genérico', 'ATA_100',
    'Severity C', 'Likelyhood', 'RiskInd', 'ALARP', 'Indicadores SPI',
    'Descriptor SRVSOP', 'Descriptor Subcategoría', 'Descriptor Descripción',
    'Confianza', 'Método']
  const rows = results.map(r => [
    r.id ?? r._idx + 1,
    (r.descripcion || '').substring(0, 60).replace(/,/g, ';'),
    r._result?.tipo_reporte ?? '',
    r._result?.peligro_generico ?? '',
    r._result?.ata_100 ?? '',
    r._result?.severity_c ?? '',
    r._result?.likelyhood ?? '',
    r._result?.risk_ind ?? '',
    r._result?.risk_alarp ?? '',
    r._result?.indicadores_spi ?? '',
    r._result?.descriptor_codigo ?? '',
    r._result?.descriptor_subcat ?? '',
    r._result?.descriptor_descripcion ?? '',
    r._result ? `${Math.round(r._result.confidence * 100)}%` : '',
    r._result?.method ?? '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `batch_clasificacion_${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

const CONCURRENCY = 3  // parallel requests

export default function BatchClient() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows]         = useState<BatchResult[]>([])
  const [running, setRunning]   = useState(false)
  const [done, setDone]         = useState(0)
  const [total, setTotal]       = useState(0)
  const [parseErr, setParseErr] = useState('')
  const abortRef = useRef(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseErr(''); setRows([]); setDone(0)
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const raw = ev.target?.result as string
        let parsed: BatchRow[] = []
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(raw)
          const arr = Array.isArray(data) ? data : [data]
          parsed = arr.map((item, i) => ({
            ...item, _idx: i,
            descripcion: item['Descripción del Evento'] || item.descripcion || item.description || '',
            causa: item['Causa Probable'] || item.causa || item.cause || '',
            id: item.ID || item.id || String(i + 1),
          })).filter((r: BatchRow) => r.descripcion)
        } else {
          parsed = parseCSV(raw)
        }
        if (!parsed.length) { setParseErr('No se encontraron registros con campo "Descripción del Evento"'); return }
        setRows(parsed.map(r => ({
          _idx: r._idx, descripcion: r.descripcion, causa: r.causa, id: r.id,
          _rawData: { ...r } as Record<string, unknown>, _status: 'pending' as const,
        })))
        setTotal(parsed.length)
      } catch { setParseErr('Error al leer el archivo. Verifica que sea CSV o JSON válido.') }
    }
    reader.readAsText(file)
  }

  async function classifyRow(row: BatchResult): Promise<BatchResult> {
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion: row.descripcion, causa: row.causa || '', barriers: [] }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return { ...row, _status: 'done', _result: data.result }
    } catch (err) {
      return { ...row, _status: 'error', _error: String(err) }
    }
  }

  async function runBatch() {
    abortRef.current = false
    setRunning(true)
    setDone(0)

    // Set all to pending
    setRows(prev => prev.map(r => ({ ...r, _status: 'pending', _result: undefined, _error: undefined })))

    const allRows = rows.map(r => ({ ...r, _status: 'pending' as const }))
    let idx = 0
    let completed = 0

    async function worker() {
      while (idx < allRows.length && !abortRef.current) {
        const myIdx = idx++
        setRows(prev => prev.map((r, i) => i === myIdx ? { ...r, _status: 'processing' } : r))
        const result = await classifyRow(allRows[myIdx])
        completed++
        setDone(completed)
        setRows(prev => prev.map((r, i) => i === myIdx ? result : r))
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    setRunning(false)
  }

  function stopBatch() { abortRef.current = true }

  const doneCount   = rows.filter(r => r._status === 'done').length
  const errorCount  = rows.filter(r => r._status === 'error').length
  const progress    = total > 0 ? Math.round((done / total) * 100) : 0
  const allFinished = rows.length > 0 && rows.every(r => r._status === 'done' || r._status === 'error')

  return (
    <div className="space-y-5">

      {/* Upload card */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">1. Cargar archivo</h3>
        <p className="text-xs text-gray-400 mb-4">
          CSV o JSON con columna <code className="bg-gray-100 px-1 rounded">Descripción del Evento</code> (requerida)
          y opcionalmente <code className="bg-gray-100 px-1 rounded">Causa Probable</code> e <code className="bg-gray-100 px-1 rounded">ID</code>.
        </p>
        <div className="flex gap-3 items-start flex-wrap">
          <div>
            <input ref={fileRef} type="file" accept=".csv,.json" onChange={handleFile} className="hidden" id="batch-file" />
            <label htmlFor="batch-file"
              className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-5 py-3 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-700">Seleccionar CSV o JSON</p>
                <p className="text-xs text-gray-400">Múltiples registros a clasificar</p>
              </div>
            </label>
          </div>
          {rows.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs">
                <span className="font-semibold text-green-700">✅ {rows.length} registros cargados</span>
              </div>
              <button onClick={() => { setRows([]); setDone(0); setTotal(0); if (fileRef.current) fileRef.current.value = '' }}
                className="text-xs text-red-400 hover:text-red-600">✕ Limpiar</button>
            </div>
          )}
        </div>
        {parseErr && <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{parseErr}</p>}
      </div>

      {/* Controls */}
      {rows.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-0.5">2. Ejecutar clasificación</h3>
              <p className="text-xs text-gray-400">
                Se procesarán {rows.length} reportes en paralelo ({CONCURRENCY} simultáneos).
                {' '}Tiempo estimado: ~{Math.ceil(rows.length / CONCURRENCY * 2)}s (sin API) / ~{Math.ceil(rows.length / CONCURRENCY * 8)}s (con Claude IA)
              </p>
            </div>
            <div className="flex gap-2">
              {!running && !allFinished && (
                <button onClick={runBatch}
                  className="flex items-center gap-1.5 bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-600 transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"/>
                  </svg>
                  Iniciar clasificación
                </button>
              )}
              {running && (
                <button onClick={stopBatch}
                  className="flex items-center gap-1.5 bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"/>
                  </svg>
                  Detener
                </button>
              )}
              {(allFinished || (!running && doneCount > 0)) && (
                <>
                  <button onClick={runBatch}
                    className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                    ↺ Re-ejecutar
                  </button>
                  <button onClick={() => exportCSV(rows)}
                    className="flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/>
                    </svg>
                    Exportar CSV
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {(running || done > 0) && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{done} de {total} procesados {running ? '(procesando…)' : ''}</span>
                <span>{progress}% · {doneCount} OK{errorCount > 0 ? ` · ${errorCount} errores` : ''}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results table */}
      {rows.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">3. Resultados</h3>
            <div className="flex gap-2 text-xs">
              <span className="text-gray-400">{rows.filter(r => r._status === 'pending').length} pendiente</span>
              <span className="text-yellow-600">{rows.filter(r => r._status === 'processing').length} procesando</span>
              <span className="text-green-600">{doneCount} completados</span>
              {errorCount > 0 && <span className="text-red-600">{errorCount} errores</span>}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-th w-8">#</th>
                  <th className="table-th">Descripción</th>
                  <th className="table-th">Tipo</th>
                  <th className="table-th">Peligro</th>
                  <th className="table-th">ATA</th>
                  <th className="table-th">Severidad</th>
                  <th className="table-th">Likelyhood</th>
                  <th className="table-th">UR</th>
                  <th className="table-th">Riesgo</th>
                  <th className="table-th">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="table-td font-mono text-gray-400 text-center">{row.id ?? i + 1}</td>
                    <td className="table-td max-w-[200px]">
                      <p className="truncate text-gray-700">{row.descripcion}</p>
                    </td>
                    <td className="table-td text-gray-600">{row._result?.tipo_reporte ?? '—'}</td>
                    <td className="table-td text-gray-600 max-w-[100px]">
                      <span className="truncate block">{row._result?.peligro_generico?.split(' - ')[0] ?? '—'}</span>
                    </td>
                    <td className="table-td text-gray-500 font-mono">{row._result?.ata_100 ?? '—'}</td>
                    <td className="table-td font-semibold" style={{ color: SEV_COLORS[row._result?.severity_c ?? ''] ?? '#9ca3af' }}>
                      {row._result?.severity_c ?? '—'}
                    </td>
                    <td className="table-td text-gray-600">{row._result?.likelyhood ?? '—'}</td>
                    <td className="table-td font-bold text-gray-800 text-center">
                      {row._result ? row._result.risk_ind : '—'}
                    </td>
                    <td className="table-td">
                      {row._result?.risk_alarp ? (
                        <span className={`risk-badge text-[10px] ${RISK_BG[row._result.risk_alarp] ?? ''}`}>
                          {row._result.risk_alarp.replace('Riesgo ', '')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="table-td text-center">
                      {row._status === 'pending' && <span className="text-gray-300 text-lg">○</span>}
                      {row._status === 'processing' && (
                        <svg className="animate-spin w-4 h-4 text-brand-500 mx-auto" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      )}
                      {row._status === 'done' && <span className="text-green-500 font-bold">✓</span>}
                      {row._status === 'error' && (
                        <span className="text-red-400 text-xs" title={row._error}>✕</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && !parseErr && (
        <div className="card p-12 flex flex-col items-center justify-center text-center text-gray-300">
          <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
          </svg>
          <p className="text-sm font-medium text-gray-400">Carga un CSV o JSON para comenzar</p>
          <p className="text-xs text-gray-300 mt-1">
            El archivo debe tener una columna <strong>Descripción del Evento</strong>
          </p>
        </div>
      )}
    </div>
  )
}
