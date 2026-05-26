'use client'
import { useState } from 'react'
import type { ClassificationResult } from '@/lib/types'
import { RISK_BG } from '@/lib/types'

const EMPTY: ClassificationResult = {
  tipo_reporte: '', peligro_generico: '', ata_100: '', ata_sign: '',
  likelyhood: '', severity_c: '', risk_ind: 0, risk_alarp: '',
  indicadores_spi: '', confidence: 0, method: 'rules',
}

export default function ClassifierForm() {
  const [descripcion, setDescripcion] = useState('')
  const [causa, setCausa] = useState('')
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClassify(e: React.FormEvent) {
    e.preventDefault()
    if (descripcion.trim().length < 20) {
      setError('La descripción debe tener al menos 20 caracteres')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion, causa }),
      })
      if (!res.ok) throw new Error('Error en la clasificación')
      const data = await res.json()
      setResult(data.result)
    } catch {
      setError('Error al conectar con el servidor. Intenta nuevamente.')
    }
    setLoading(false)
  }

  const methodLabel: Record<string, string> = {
    'claude-api': '🤖 Claude IA (alta precisión)',
    'ml-local':   '⚙️ Motor ML local',
    'rules':      '📋 Reglas',
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Datos del Evento</h3>
        <form onSubmit={handleClassify} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Descripción del Evento <span className="text-red-500">*</span>
            </label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={7}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Describe detalladamente el evento, falla, condición o situación de seguridad observada..."
            />
            <p className="text-xs text-gray-400 mt-1">{descripcion.length} caracteres</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Causa Probable
            </label>
            <textarea
              value={causa}
              onChange={e => setCausa(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Causa probable o raíz del evento..."
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-xs px-3 py-2.5 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-700 hover:bg-brand-600 text-white text-sm font-semibold py-3 rounded-lg transition disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Clasificando...
              </span>
            ) : 'Clasificar Reporte'}
          </button>
        </form>
      </div>

      {/* Result */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Clasificación Resultante</h3>
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-300">
            <svg className="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
            </svg>
            <p className="text-sm">Ingresa un evento y presiona Clasificar</p>
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <svg className="animate-spin w-10 h-10 mb-3 text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-sm">Analizando el reporte...</p>
          </div>
        )}
        {result && (
          <div className="space-y-3">
            {/* Method & confidence */}
            <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              <span>{methodLabel[result.method]}</span>
              <span className="font-semibold text-brand-700">
                {Math.round(result.confidence * 100)}% confianza
              </span>
            </div>

            {/* Fields */}
            {[
              { label: 'Tipo de Reporte', value: result.tipo_reporte },
              { label: 'Peligro Genérico', value: result.peligro_generico },
              { label: 'ATA_100', value: result.ata_100 ? `${result.ata_100} — ${result.ata_sign}` : '—' },
              { label: 'Likelyhood', value: result.likelyhood },
              { label: 'Severity C', value: result.severity_c },
              { label: 'Indicadores SPI', value: result.indicadores_spi || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500 font-medium">{label}</span>
                <span className="text-sm text-gray-800 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                  {value || '—'}
                </span>
              </div>
            ))}

            {/* Risk */}
            <div className="flex gap-3 mt-2">
              <div className="flex-1">
                <span className="text-xs text-gray-500 font-medium">RiskInd</span>
                <p className="text-2xl font-bold text-gray-800 mt-0.5">{result.risk_ind}</p>
              </div>
              <div className="flex-1">
                <span className="text-xs text-gray-500 font-medium">Nivel de Riesgo</span>
                <div className={`mt-1 risk-badge ${RISK_BG[result.risk_alarp] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  {result.risk_alarp}
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
              ⚠️ Verificar clasificaciones con supervisor antes de registrar oficialmente
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
