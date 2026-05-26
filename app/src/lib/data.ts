import type { SMSRecord, Correction, ATAItem, RiskMatrixItem, TrainingRecord, Stats } from './types'

// Importaciones estáticas de JSON (Next.js resuelve esto en build time)
import bbddRaw       from '@/data/bbdd_full.json'
import correctionsRaw from '@/data/corrections_2026.json'
import ataRaw        from '@/data/ata_lookup.json'
import matrizRaw     from '@/data/matriz_sms.json'
import statsRaw      from '@/data/stats.json'
import trainingRaw   from '@/data/training_data.json'

export const allRecords    = bbddRaw      as SMSRecord[]
export const corrections   = correctionsRaw as Correction[]
export const ataLookup     = ataRaw       as ATAItem[]
export const riskMatrix    = matrizRaw    as RiskMatrixItem[]
export const stats         = statsRaw     as Stats
export const trainingData  = trainingRaw  as TrainingRecord[]

export const records2026   = allRecords.filter(r => r.Year === 2026)
export const recordsPre2026 = allRecords.filter(r => r.Year < 2026)

export function getRiskFromMatrix(severity: string, likelyhood: string): RiskMatrixItem | null {
  return riskMatrix.find(r =>
    r.severity.trim() === severity.trim() &&
    r.likelyhood.trim() === likelyhood.trim()
  ) ?? null
}

export function getATASign(ataCode: string): string {
  const item = ataLookup.find(a => a.code === ataCode)
  return item?.sign ?? ''
}

export function getSPIForPeligro(peligro: string, descripcion = ''): string {
  const spiMap: Record<string, string> = {
    'DOC - Documentación inapropiada': descripcion.toLowerCase().includes('desactualiz') || descripcion.toLowerCase().includes('consulta')
      ? 'Consulta de textos desactualizados'
      : 'Datos o procedimientos de mantenimiento incorrectos o deficientes',
    'PRO - Procedimientos de mantenimiento incorrectos':
      'Datos o procedimientos de mantenimiento incorrectos o deficientes',
    'MDA - Mantenimiento deficiente de aeronaves':
      'Datos o procedimientos de mantenimiento incorrectos o deficientes',
    'DGA - Daños graves causados a una aeronave durante las actividades de mantenimiento':
      'Daños graves causados a una aeronave durante las actividades de mantenimiento',
    'GAR - Requerimientos de garantía por servicios deficientes': 'Reclamación por garantías',
    'ALM - Almacenamiento inadecuado de componentes': 'Incorrecto almacenaje de componentes aeronáuticos',
    'FH - Factores humanos como; aspectos psicosociales e incapacidad evidente del personal técnico':
      'Datos o procedimientos de mantenimiento incorrectos o deficientes',
    'GH - Operaciones inadecuadas en tierra':
      'Datos o procedimientos de mantenimiento incorrectos o deficientes',
    'HAN - Problemas con las instalaciones del hangar, taller o base auxiliar de mantenimiento':
      'Datos o procedimientos de mantenimiento incorrectos o deficientes',
    'HER - Uso de herramientas inapropiadas':
      'Datos o procedimientos de mantenimiento incorrectos o deficientes',
    'FOD - Foreing Object Debris/Damage':
      'Datos o procedimientos de mantenimiento incorrectos o deficientes',
  }
  return spiMap[peligro] ?? ''
}
