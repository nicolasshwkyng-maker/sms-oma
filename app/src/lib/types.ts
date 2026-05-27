export interface SMSRecord {
  ID: number
  Estatus: string | null
  Tipo_Elemento: string | null
  'Fecha Evento': string | null
  'Hora del Evento': string | null
  Origen_Reporte: string | null
  Area_Generadora: string | null
  Flota: string | null
  Matricula: string | null
  Base: string | null
  'Descripción del Evento': string | null
  'Causa Probable': string | null
  Area_Causante: string | null
  Sub_Area_Causante: string | null
  'Tipo Reporte': string | null
  'Peligro Generico': string | null
  ATA_100: string | null
  'ATA_100: ATA_Sign': string | null
  Descriptor: string | null
  Consecuencias: string | null
  'Defensas Actuales Para Controlar el Riesgo': string | null
  Likelyhood: string | null
  'Severity C': string | null
  RiskInd: number | null
  'RiskInd: Likelyhood2': string | null
  'RiskInd: ALARP': string | null
  'RiskInd: Days': number | null
  'Resp. Gestion': string | null
  'Conciencia del Error': string | null
  'Indicadores SPI': string | null
  'Plan de Acción': string | null
  ResRiskInd: number | null
  'ResRiskInd: ALARP2': string | null
  'Tolerabilidad Residual': string | null
  Retroalimentación: string | null
  'Tipo de elemento': string | null
  'Ruta de acceso': string | null
  Year: number
}

export interface Correction {
  ID: number
  'Fecha Evento': string
  Flota: string
  'Área Generadora': string
  Campo: string
  'Valor Original': string
  'Valor Corregido': string
  Justificación: string
}

export interface ATAItem {
  code: string
  sign: string
}

export interface RiskMatrixItem {
  riskInd: number
  severity: string
  likelyhood: string
  alarp: string
  factor12: number
  factor13: number
}

export interface TrainingRecord {
  texto: string
  area: string
  flota: string
  tipo_reporte: string
  peligro_generico: string
  ata: string
  likelyhood: string
  severity: string
  risk_alarp: string
  indicadores_spi: string
  year: number
  descriptor_codigo?: string
  descriptor_subcat?: string
  descriptor_descripcion?: string
}

export interface Barrier {
  id: number
  nombre: string
  tipo: 'T' | 'R' | 'E' | 'O'
  efectividad: number   // 0, 20, 50, 80, 100
}

export interface ClassificationResult {
  tipo_reporte: string
  peligro_generico: string
  ata_100: string
  ata_sign: string
  likelyhood: string
  severity_c: string
  risk_ind: number
  risk_alarp: string
  indicadores_spi: string
  confidence: number
  method: 'claude-api' | 'ml-local' | 'rules'
  // Extended ARMS analysis
  severity_pcrp?: {
    aeronave: string; personas: string; regulacion: string
    reputacion: string; ambiente: string; peor: string
  }
  efectividad_global?: number          // 0-100 %
  likelyhood_from_barriers?: string    // probability suggested by barriers
  justificacion_severidad?: string
  justificacion_probabilidad?: string
  area_gestora?: string
  responsable_sugerido?: string
  plan_gestion?: string
  // SRVSOP Descriptor
  descriptor_codigo?: string
  descriptor_subcat?: string
  descriptor_descripcion?: string
}

export interface Stats {
  total_records: number
  by_year: Record<string, number>
  by_peligro: Record<string, number>
  by_area_2026: Record<string, number>
  by_alarp_2026: Record<string, number>
  by_tipo_reporte: Record<string, number>
  corrections_count: number
  corrections_by_field: Record<string, number>
  high_risk_2026: number
  peligros_options: string[]
  likelyhood_options: string[]
  severity_options: string[]
  spi_options: string[]
  // Extended stats
  by_month_2026?: Record<string, number>
  by_month_2025?: Record<string, number>
  by_severity?: Record<string, number>
  by_alarp_all?: Record<string, number>
  by_tipo_year?: Record<string, Record<string, number>>
  proactivo_rate_2026?: number
  proactivo_count_2026?: number
}

export const RISK_COLORS: Record<string, string> = {
  'Riesgo Extremo': '#c00000',
  'Riesgo Alto':    '#ed7d31',
  'Riesgo Medio':   '#ffc000',
  'Riesgo Bajo':    '#70ad47',
}

export const RISK_BG: Record<string, string> = {
  'Riesgo Extremo': 'bg-red-100 text-red-800 border-red-300',
  'Riesgo Alto':    'bg-orange-100 text-orange-800 border-orange-300',
  'Riesgo Medio':   'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Riesgo Bajo':    'bg-green-100 text-green-800 border-green-300',
}
