/**
 * Clasificador de reportes SMS OMA
 * - Con API key Anthropic: usa Claude claude-haiku-4-5 con ejemplos históricos
 * - Sin API key: usa sistema de keywords + patrones históricos
 */
import type { ClassificationResult, TrainingRecord } from './types'
import { riskMatrix, getSPIForPeligro } from './data'

// ─── Reglas de clasificación por keywords ────────────────────────────────────
const PELIGRO_KEYWORDS: Record<string, string[]> = {
  'DOC - Documentación inapropiada': [
    'document', 'manual', 'formato', 'forma', 'procedimiento', 'impreso', 'registro',
    'desactualiz', 'vigente', 'publicad', 'versión', 'tarea impresa', 'orden de ingeniería',
    'word record', 'nri', 'sol-rep', 'tarea', 'form',
  ],
  'PRO - Procedimientos de mantenimiento incorrectos': [
    'procedimiento incorrecto', 'no se siguió', 'sin seguir', 'incorrecto procedimiento',
    'tarea incorrecta', 'modificación no autorizada', 'sin autorización', 'no autorizado',
    'vencía', 'vencimiento', 'diferido vencido', 'diferido', 'fecha de vencimiento',
  ],
  'GH - Operaciones inadecuadas en tierra': [
    'diamante', 'rampa', 'parqueo', 'menzies', 'ground', 'tierra', 'remolque',
    'tow', 'taxiing', 'invasion', 'invasión', 'zona de seguridad', 'gpu', 'cable gpu',
    'motor encendido', 'succión', 'pista', 'runway', 'luces pista',
  ],
  'MDA - Mantenimiento deficiente de aeronaves': [
    'sensor', 'falla', 'fallo', 'intermitente', 'inoperativo', 'roto', 'dañado',
    'avería', 'desgaste', 'corrosión', 'nri', 'diferido', 'componente', 'no cierra',
    'handset', 'taxi light', 'broken', 'lamp', 'fdr', 'reparación', 'reemplazo',
  ],
  'HAN - Problemas con las instalaciones del hangar, taller o base auxiliar de mantenimiento': [
    'hangar', 'instalación', 'instalaciones', 'gato hidráulico', 'gatos', 'silla',
    'mueble', 'toma eléctrica', 'báscula', 'báscula', 'bancos', 'equipo de apoyo',
    'infraestructura', 'gpu', 'etaa', 'ausencia de', 'no hay',
  ],
  'HER - Uso de herramientas inapropiadas': [
    'herramienta', 'tool', 'embudo', 'gun', 'puntas', 'extensión', 'acoplé',
    'lubricadora', 'equipo inadecuado', 'sin herramienta',
  ],
  'FOD - Foreing Object Debris/Damage': [
    'fod', 'objeto extraño', 'foreign object', 'escombros', 'piedras', 'trapo',
    'basura', 'residuo', 'caneca', 'embudo encontrado', 'dentro del motor',
  ],
  'FH - Factores humanos como; aspectos psicosociales e incapacidad evidente del personal técnico': [
    'factor humano', 'fatiga', 'error humano', 'descuido', 'falta de atención',
    'distraído', 'psicosocial', 'presión', 'vigilancia', 'interrupción',
  ],
  'DGA - Daños graves causados a una aeronave durante las actividades de mantenimiento': [
    'daño grave', 'daño en aeronave', 'estructura dañada', 'golpe', 'abolladura',
    'scratched', 'dented', 'damage to aircraft',
  ],
  'ALM - Almacenamiento inadecuado de componentes': [
    'almacenamiento', 'almacén', 'componente almacenado', 'storage', 'instalación no autorizada',
    'espejo instalado', 'instalado sin autorización',
  ],
  'GAR - Requerimientos de garantía por servicios deficientes': [
    'garantía', 'warranty', 'reclamación', 'servicio deficiente', 'garantia',
  ],
}

const ATA_KEYWORDS: Record<string, string[]> = {
  'ATA_05': ['time limit', 'maintenance check', 'programa de mantenimiento', 'vencimiento'],
  'ATA_07': ['gato', 'gatos hidráulicos', 'levantamiento', 'apoyo', 'etaa', 'banco de apoyo'],
  'ATA_09': ['remolque', 'tow', 'towing', 'taxiing'],
  'ATA_12': ['servicio', 'lubricación general', 'aceite general'],
  'ATA_21': ['aire acondicionado', 'presurización'],
  'ATA_23': ['comunicación', 'handset', 'radio', 'interphone', 'attendant'],
  'ATA_24': ['eléctrico', 'electrical', 'gpu', 'cable gpu', 'poder eléctrico'],
  'ATA_25': ['galley', 'cocina', 'furnishing', 'equipo cabina', 'espejo', 'seat'],
  'ATA_26': ['fuego', 'fire', 'detección incendio', 'extintor'],
  'ATA_28': ['combustible', 'fuel', 'gasolina'],
  'ATA_29': ['hidráulico', 'hydraulic'],
  'ATA_30': ['hielo', 'ice', 'anti-ice'],
  'ATA_31': ['fdr', 'cvr', 'flight data', 'grabadora', 'esis', 'recording', 'indicat'],
  'ATA_32': ['tren de aterrizaje', 'landing gear', 'freno', 'brake', 'rueda', 'wheel', 'tren de nariz', 'nose gear'],
  'ATA_33': ['luz', 'luces', 'light', 'lamp', 'iluminación', 'taxi light', 'runway light'],
  'ATA_34': ['navegación', 'navigation', 'terrain', 'obstacle', 'database', 'base de datos'],
  'ATA_35': ['oxígeno', 'oxygen'],
  'ATA_50': ['compartimento de carga', 'cargo', 'compartment'],
  'ATA_52': ['puerta', 'door', 'compuerta'],
  'ATA_53': ['fuselaje', 'fuselage', 'estructura'],
  'ATA_57': ['ala', 'wing', 'aileron'],
  'ATA_61': ['hélice', 'propeller'],
  'ATA_71': ['motor', 'power plant', 'engine cowling', 'cubierta motor'],
  'ATA_72': ['motor turbina', 'engine turbine', 'turboprop'],
  'ATA_76': ['control motor', 'engine control'],
  'ATA_77': ['indicación motor', 'torque', 'engine indicating', 'rpm indicat'],
  'ATA_79': ['aceite motor', 'oil service', 'servicio aceite', 'embudo aceite'],
}

function scoreKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase()
  return keywords.reduce((score, kw) => score + (lower.includes(kw.toLowerCase()) ? 1 : 0), 0)
}

function classifyPeligro(texto: string): string {
  const scores = Object.entries(PELIGRO_KEYWORDS).map(([peligro, kws]) => ({
    peligro,
    score: scoreKeywords(texto, kws),
  }))
  scores.sort((a, b) => b.score - a.score)
  return scores[0].score > 0 ? scores[0].peligro : 'MDA - Mantenimiento deficiente de aeronaves'
}

function classifyATA(texto: string): { code: string; sign: string } {
  const scores = Object.entries(ATA_KEYWORDS).map(([code, kws]) => ({
    code,
    score: scoreKeywords(texto, kws),
  }))
  scores.sort((a, b) => b.score - a.score)
  if (scores[0].score === 0) return { code: '', sign: '' }
  const code = scores[0].code
  const signs: Record<string, string> = {
    'ATA_05': 'Time Limits/Maintenance Checks',
    'ATA_07': 'Lifting And Shoring',
    'ATA_09': 'Towing And Taxiing',
    'ATA_12': 'Servicing',
    'ATA_21': 'Air Conditioning',
    'ATA_23': 'Communication',
    'ATA_24': 'Electrical Power',
    'ATA_25': 'Equipment /Furnishings',
    'ATA_26': 'Fire Protection',
    'ATA_28': 'Fuel',
    'ATA_29': 'Hydraulic Power',
    'ATA_30': 'Ice And Rain Protection',
    'ATA_31': 'Indicating/Recording Systems',
    'ATA_32': 'Landing Gear',
    'ATA_33': 'Lights',
    'ATA_34': 'Navigation',
    'ATA_35': 'Oxygen',
    'ATA_50': 'Cargo And Accessory Compartments',
    'ATA_52': 'Doors',
    'ATA_53': 'Fuselage',
    'ATA_57': 'Wings',
    'ATA_61': 'Propellers/ Propulsors',
    'ATA_71': 'Power Plant',
    'ATA_72': 'Engine',
    'ATA_76': 'Engine Controls',
    'ATA_77': 'Engine Indicating',
    'ATA_79': 'Oil',
  }
  return { code, sign: signs[code] ?? '' }
}

function classifyTipoReporte(texto: string): string {
  const lower = texto.toLowerCase()
  const reactivo = ['ocurrió', 'se presentó', 'se evidenció', 'encontró', 'detectó', 'reporta',
    'falla', 'roto', 'dañado', 'incidente', 'evento', 'llegada del avión', 'durante vuelo',
    'durante el despegue', 'aterrizaje']
  const proactivo = ['se recomienda', 'recomendación', 'ausencia de', 'no hay', 'falta de',
    'se evidencia condición', 'proactivo', 'condición peligrosa', 'posible riesgo']
  const rs = scoreKeywords(lower, reactivo)
  const ps = scoreKeywords(lower, proactivo)
  return ps > rs ? 'Proactivo' : 'Reactivo'
}

function classifyRisk(texto: string, peligro: string): { likelyhood: string; severity: string } {
  const lower = texto.toLowerCase()
  // Severity heuristics
  let severity = 'Importante'
  if (['DGA', 'catastrófico', 'muerte', 'accidente grave', 'colisión', 'incendio', 'catastrofico'].some(k => lower.includes(k.toLowerCase()))) {
    severity = 'Catastrofico'
  } else if (['peligroso', 'daño grave', 'herida', 'lesión', 'engine', 'motor', 'fdr', 'freno'].some(k => lower.includes(k.toLowerCase()))) {
    severity = 'Peligroso'
  } else if (['leve', 'menor', 'bajo', 'silla', 'mueble', 'embudo', 'espejo', 'luces', 'administrativo'].some(k => lower.includes(k.toLowerCase()))) {
    severity = 'Leve'
  }

  // Likelyhood heuristics
  let likelyhood = 'Ocasional'
  if (['frecuente', 'repetidamente', 'siempre', 'cada vez', 'constante', 'recurrente'].some(k => lower.includes(k.toLowerCase()))) {
    likelyhood = 'Frecuente'
  } else if (['probable', 'posible que ocurra', 'podría'].some(k => lower.includes(k.toLowerCase()))) {
    likelyhood = 'Probable'
  } else if (['improbable', 'pocas veces', 'raro', 'difícil que'].some(k => lower.includes(k.toLowerCase()))) {
    likelyhood = 'Improbable'
  } else if (['sumamente improbable', 'casi imposible', 'muy raro'].some(k => lower.includes(k.toLowerCase()))) {
    likelyhood = 'Sumamente Improbable'
  }
  return { likelyhood, severity }
}

// ─── Clasificador local (sin API) ─────────────────────────────────────────────
export function classifyLocal(
  descripcion: string,
  causa: string,
  training: TrainingRecord[]
): ClassificationResult {
  const texto = `${descripcion} ${causa}`
  const peligro = classifyPeligro(texto)
  const { code: ataCode, sign: ataSign } = classifyATA(texto)
  const tipoReporte = classifyTipoReporte(texto)
  const { likelyhood, severity } = classifyRisk(texto, peligro)

  const riskRow = riskMatrix.find(r =>
    r.severity === severity && r.likelyhood === likelyhood
  )
  const riskInd  = riskRow?.riskInd ?? 100
  const riskAlarp = riskRow?.alarp ?? 'Riesgo Medio'
  const spi = getSPIForPeligro(peligro, descripcion)

  return {
    tipo_reporte: tipoReporte,
    peligro_generico: peligro,
    ata_100: ataCode,
    ata_sign: ataSign,
    likelyhood,
    severity_c: severity,
    risk_ind: riskInd,
    risk_alarp: riskAlarp,
    indicadores_spi: spi,
    confidence: 0.65,
    method: 'ml-local',
  }
}

// ─── Clasificador con Claude API ──────────────────────────────────────────────
export async function classifyWithClaude(
  descripcion: string,
  causa: string,
  training: TrainingRecord[]
): Promise<ClassificationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return classifyLocal(descripcion, causa, training)
  }

  // Seleccionar 15 ejemplos representativos como few-shot
  const examples = training
    .filter(r => r.peligro_generico && r.peligro_generico !== 'None')
    .slice(0, 15)
    .map(r => `Descripción: "${r.texto.substring(0, 200)}"
Clasificación:
- Tipo Reporte: ${r.tipo_reporte}
- Peligro Genérico: ${r.peligro_generico}
- ATA_100: ${r.ata || 'N/A'}
- Likelyhood: ${r.likelyhood || 'Ocasional'}
- Severity C: ${r.severity || 'Importante'}
- Indicadores SPI: ${r.indicadores_spi || 'N/A'}`)
    .join('\n\n---\n\n')

  const prompt = `Eres un experto en Seguridad Operacional (SMS) de aviación de SATENA, aerolínea colombiana de aviación regional.

Analiza el siguiente reporte de mantenimiento y clasifícalo según los parámetros del SMS OMA.

EJEMPLOS HISTÓRICOS DE CLASIFICACIÓN:
${examples}

---

REPORTE A CLASIFICAR:
Descripción: "${descripcion}"
Causa Probable: "${causa}"

OPCIONES VÁLIDAS:
Tipo Reporte: Reactivo | Proactivo
Peligro Genérico:
  - ALM - Almacenamiento inadecuado de componentes
  - DGA - Daños graves causados a una aeronave durante las actividades de mantenimiento
  - DOC - Documentación inapropiada
  - FH - Factores humanos como; aspectos psicosociales e incapacidad evidente del personal técnico
  - FOD - Foreing Object Debris/Damage
  - GAR - Requerimientos de garantía por servicios deficientes
  - GH - Operaciones inadecuadas en tierra
  - HAN - Problemas con las instalaciones del hangar, taller o base auxiliar de mantenimiento
  - HER - Uso de herramientas inapropiadas
  - MDA - Mantenimiento deficiente de aeronaves
  - PRO - Procedimientos de mantenimiento incorrectos
Likelyhood: Frecuente | Probable | Ocasional | Improbable | Sumamente Improbable
Severity C: Catastrofico | Peligroso | Importante | Leve | Insignificante

Responde ÚNICAMENTE con JSON válido:
{
  "tipo_reporte": "...",
  "peligro_generico": "...",
  "ata_100": "ATA_XX o vacío",
  "ata_sign": "descripción ATA o vacío",
  "likelyhood": "...",
  "severity_c": "...",
  "justificacion": "breve explicación"
}`

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])

    const riskRow = riskMatrix.find(r =>
      r.severity === parsed.severity_c && r.likelyhood === parsed.likelyhood
    )
    const riskInd  = riskRow?.riskInd ?? 100
    const riskAlarp = riskRow?.alarp ?? 'Riesgo Medio'
    const spi = getSPIForPeligro(parsed.peligro_generico, descripcion)

    return {
      tipo_reporte:   parsed.tipo_reporte,
      peligro_generico: parsed.peligro_generico,
      ata_100:        parsed.ata_100 ?? '',
      ata_sign:       parsed.ata_sign ?? '',
      likelyhood:     parsed.likelyhood,
      severity_c:     parsed.severity_c,
      risk_ind:       riskInd,
      risk_alarp:     riskAlarp,
      indicadores_spi: spi,
      confidence:     0.92,
      method: 'claude-api',
    }
  } catch {
    return classifyLocal(descripcion, causa, training)
  }
}
