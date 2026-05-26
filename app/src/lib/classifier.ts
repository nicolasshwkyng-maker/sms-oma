/**
 * Clasificador SMS OMA — extendido con análisis ARMS:
 * barreras, severidad PCRP, justificación, área gestora, plan de gestión.
 */
import type { ClassificationResult, TrainingRecord, Barrier } from './types'
import { riskMatrix, getSPIForPeligro } from './data'

// ─── Matrices ARMS ────────────────────────────────────────────────────────────
export const UR_MATRIX: Record<number, Record<string, number>> = {
  5: { SI: 101, I: 252, O: 501, P: 1500, F: 2500 },
  4: { SI: 52,  I: 125, O: 251, P: 750,  F: 1250 },
  3: { SI: 20,  I: 51,  O: 100, P: 300,  F: 500  },
  2: { SI: 10,  I: 25,  O: 50,  P: 150,  F: 250  },
  1: { SI: 0.04,I: 0.1, O: 0.2, P: 0.6, F: 1    },
}
export const SEV_NUM: Record<string, number> = {
  Catastrofico: 5, Peligroso: 4, Importante: 3, Leve: 2, Insignificante: 1
}
export const PROB_CODE: Record<string, string> = {
  'Sumamente Improbable': 'SI', Improbable: 'I', Ocasional: 'O', Probable: 'P', Frecuente: 'F'
}
export const TOLERABILITY = [
  { name: 'Extremo', min: 500,  alarp: 'Riesgo Extremo', time: '< 2 días',  color: '#c00000' },
  { name: 'Alto',    min: 250,  alarp: 'Riesgo Alto',    time: '≤ 20 días', color: '#e06000' },
  { name: 'Medio',   min: 20,   alarp: 'Riesgo Medio',   time: '≤ 40 días', color: '#b8860b' },
  { name: 'Bajo',    min: 0,    alarp: 'Riesgo Bajo',    time: '≤ 60 días', color: '#375623' },
]

export function calcTolerab(ur: number) {
  return TOLERABILITY.find(t => ur >= t.min) ?? TOLERABILITY[TOLERABILITY.length - 1]
}

// ─── Cálculo de efectividad de barreras → probabilidad ───────────────────────
export function barriersToProbability(barriers: Barrier[]): {
  efectividad_global: number
  likelyhood: string
} {
  if (!barriers.length) return { efectividad_global: -1, likelyhood: '' }
  const evaluated = barriers.filter(b => b.efectividad >= 0)
  if (!evaluated.length) return { efectividad_global: -1, likelyhood: '' }

  const avg = evaluated.reduce((s, b) => s + b.efectividad, 0) / evaluated.length
  let likelyhood: string
  if (avg >= 90)      likelyhood = 'Sumamente Improbable'
  else if (avg >= 65) likelyhood = 'Improbable'
  else if (avg >= 35) likelyhood = 'Ocasional'
  else if (avg >= 10) likelyhood = 'Probable'
  else                likelyhood = 'Frecuente'
  return { efectividad_global: Math.round(avg), likelyhood }
}

// ─── Helpers de keywords ──────────────────────────────────────────────────────
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
    'mueble', 'toma eléctrica', 'báscula', 'bancos', 'equipo de apoyo',
    'infraestructura', 'etaa', 'ausencia de', 'no hay',
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
    'garantía', 'warranty', 'reclamación', 'servicio deficiente',
  ],
}

const ATA_KEYWORDS: Record<string, string[]> = {
  'ATA_05': ['time limit', 'maintenance check', 'programa de mantenimiento', 'vencimiento'],
  'ATA_07': ['gato', 'gatos hidráulicos', 'levantamiento', 'apoyo', 'etaa'],
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
  'ATA_32': ['tren de aterrizaje', 'landing gear', 'freno', 'brake', 'rueda', 'wheel'],
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
const ATA_SIGNS: Record<string, string> = {
  'ATA_05': 'Time Limits/Maintenance Checks', 'ATA_07': 'Lifting And Shoring',
  'ATA_09': 'Towing And Taxiing',            'ATA_12': 'Servicing',
  'ATA_21': 'Air Conditioning',              'ATA_23': 'Communication',
  'ATA_24': 'Electrical Power',              'ATA_25': 'Equipment /Furnishings',
  'ATA_26': 'Fire Protection',               'ATA_28': 'Fuel',
  'ATA_29': 'Hydraulic Power',               'ATA_30': 'Ice And Rain Protection',
  'ATA_31': 'Indicating/Recording Systems',  'ATA_32': 'Landing Gear',
  'ATA_33': 'Lights',                        'ATA_34': 'Navigation',
  'ATA_35': 'Oxygen',                        'ATA_50': 'Cargo And Accessory Compartments',
  'ATA_52': 'Doors',                         'ATA_53': 'Fuselage',
  'ATA_57': 'Wings',                         'ATA_61': 'Propellers/ Propulsors',
  'ATA_71': 'Power Plant',                   'ATA_72': 'Engine',
  'ATA_76': 'Engine Controls',               'ATA_77': 'Engine Indicating',
  'ATA_79': 'Oil',
}

function score(text: string, kws: string[]): number {
  const l = text.toLowerCase()
  return kws.reduce((s, k) => s + (l.includes(k.toLowerCase()) ? 1 : 0), 0)
}

function classifyPeligro(txt: string): string {
  const ranked = Object.entries(PELIGRO_KEYWORDS)
    .map(([p, kws]) => ({ p, s: score(txt, kws) }))
    .sort((a, b) => b.s - a.s)
  return ranked[0].s > 0 ? ranked[0].p : 'MDA - Mantenimiento deficiente de aeronaves'
}

function classifyATA(txt: string): { code: string; sign: string } {
  const ranked = Object.entries(ATA_KEYWORDS)
    .map(([c, kws]) => ({ c, s: score(txt, kws) }))
    .sort((a, b) => b.s - a.s)
  if (!ranked[0].s) return { code: '', sign: '' }
  return { code: ranked[0].c, sign: ATA_SIGNS[ranked[0].c] ?? '' }
}

function classifyTipo(txt: string): string {
  const r = score(txt, ['ocurrió','se presentó','se evidenció','encontró','detectó','falla','roto','dañado','durante el despegue','aterrizaje'])
  const p = score(txt, ['se recomienda','ausencia de','no hay','falta de','condición peligrosa'])
  return p > r ? 'Proactivo' : 'Reactivo'
}

function classifyRisk(txt: string): { likelyhood: string; severity: string } {
  const l = txt.toLowerCase()
  let sev = 'Importante'
  if (['catastróf','muerte','accidente grave','colisión','incendio'].some(k => l.includes(k))) sev = 'Catastrofico'
  else if (['peligroso','daño grave','herida','lesión','engine','motor','fdr','freno'].some(k => l.includes(k))) sev = 'Peligroso'
  else if (['leve','menor','silla','mueble','embudo','espejo','administrativo'].some(k => l.includes(k))) sev = 'Leve'

  let like = 'Ocasional'
  if (['frecuente','repetidamente','siempre','constante','recurrente'].some(k => l.includes(k))) like = 'Frecuente'
  else if (['probable','podría'].some(k => l.includes(k))) like = 'Probable'
  else if (['improbable','pocas veces','raro'].some(k => l.includes(k))) like = 'Improbable'
  else if (['sumamente improbable','casi imposible'].some(k => l.includes(k))) like = 'Sumamente Improbable'
  return { likelyhood: like, severity: sev }
}

function localAreaGestora(peligro: string, area: string): { area_gestora: string; responsable: string } {
  const code = peligro.split(' - ')[0]
  const map: Record<string, [string, string]> = {
    DOC: ['Gestión de Aeronavegabilidad', 'Jefe de Aeronavegabilidad'],
    PRO: ['Mantenimiento / CCM', 'Jefe de Mantenimiento'],
    GH:  ['Inspección y Calidad / Operaciones', 'Jefe de Inspección y Calidad'],
    MDA: ['Mantenimiento / Ingeniería', 'Jefe de Mantenimiento'],
    HAN: ['Mantenimiento / Logística', 'Jefe de Mantenimiento'],
    HER: ['Mantenimiento', 'Jefe de Mantenimiento'],
    FOD: ['Seguridad Operacional', 'Jefe de Seguridad Operacional SMS'],
    FH:  ['Seguridad Operacional / RRHH', 'Jefe de Seguridad Operacional SMS'],
    ALM: ['Logística / Almacén', 'Jefe de Logística'],
    DGA: ['Mantenimiento / Seguridad Operacional', 'Jefe de Seguridad Operacional SMS'],
    GAR: ['Ingeniería / Calidad', 'Jefe de Ingeniería'],
  }
  const [ag, resp] = map[code] ?? ['Seguridad Operacional SMS', 'Jefe de Seguridad Operacional SMS']
  return { area_gestora: ag, responsable: resp }
}

function localPlan(peligro: string): string {
  const code = peligro.split(' - ')[0]
  const plans: Record<string, string> = {
    DOC: '1. Retirar del servicio la documentación desactualizada de forma inmediata.\n2. Verificar vigencia de toda la documentación en uso en el área afectada.\n3. Capacitar al personal en el procedimiento de control de documentos.\n4. Implementar auditoría mensual de vigencia documental.',
    PRO: '1. Detener la actividad hasta verificar el procedimiento correcto aplicable.\n2. Investigar causa raíz del incumplimiento de procedimiento.\n3. Implementar verificación doble (dual sign-off) para tareas críticas.\n4. Reforzar la capacitación en los procedimientos afectados.',
    GH:  '1. Señalizar y hacer cumplir los límites del diamante de seguridad.\n2. Coordinar con entidades externas el cumplimiento del protocolo de rampa.\n3. Documentar y reportar a supervisión todo incidente de invasión de zona de seguridad.\n4. Socializar el protocolo de ground handling al personal externo involucrado.',
    MDA: '1. Suspender la operación del sistema afectado hasta la corrección del defecto.\n2. Abrir NRI e investigar causa raíz del mantenimiento deficiente.\n3. Verificar tareas similares pendientes en toda la flota.\n4. Revisar estándares de calidad para la tarea de mantenimiento involucrada.',
    HAN: '1. Reportar la deficiencia de infraestructura/herramienta al área de logística.\n2. Gestionar la adquisición o reparación prioritaria del recurso faltante.\n3. Implementar inventario periódico de equipos de soporte en tierra.\n4. Demarcar y señalizar áreas de trabajo y vías de circulación.',
    FOD: '1. Realizar barrido FOD inmediato del área operativa afectada.\n2. Implementar lista de chequeo anti-FOD obligatoria antes de cada operación.\n3. Investigar el origen del FOD identificado y tomar acciones correctivas.\n4. Reforzar la concientización al personal sobre los riesgos de FOD.',
    FH:  '1. Analizar los factores humanos presentes en el evento (Modelo Shell).\n2. Evaluar la carga de trabajo, condiciones del entorno y bienestar del personal.\n3. Implementar herramientas de gestión de amenazas y errores (TEM).\n4. Reforzar la comunicación entre áreas y establecer canales de reporte voluntario.',
    ALM: '1. Verificar las condiciones y cumplimiento del procedimiento de almacenamiento.\n2. Auditar el área de almacén e identificar componentes en condición no conforme.\n3. Capacitar al personal en los estándares de almacenaje aeronáutico aplicables.\n4. Implementar lista de verificación de recepción y despacho de componentes.',
    DGA: '1. Documentar fotográficamente el daño y notificar a Ingeniería e Inspección.\n2. Suspender el uso de la aeronave o componente afectado hasta evaluación técnica.\n3. Abrir NRI e investigar la causa raíz del daño.\n4. Revisar procedimientos de manipulación y actividades de mantenimiento relacionadas.',
    GAR: '1. Registrar la reclamación de garantía y notificar al proveedor de servicios.\n2. Documentar el defecto y evidencias de la prestación del servicio deficiente.\n3. Gestionar la corrección o compensación con el proveedor en el plazo establecido.\n4. Revisar el proceso de aceptación técnica del servicio contratado.',
    HER: '1. Retirar de servicio la herramienta deficiente o inapropiada de inmediato.\n2. Gestionar la reparación, sustitución o adquisición de la herramienta correcta.\n3. Verificar el estado general del inventario de herramientas críticas del área.\n4. Reforzar el control y registro del estado de herramientas en uso.',
  }
  return plans[code] ?? '1. Investigar la causa raíz del evento reportado.\n2. Implementar acciones correctivas y preventivas inmediatas.\n3. Verificar la efectividad de las medidas adoptadas.\n4. Documentar y socializar las lecciones aprendidas con el personal.'
}

// ─── Clasificador local ───────────────────────────────────────────────────────
export function classifyLocal(
  descripcion: string,
  causa: string,
  training: TrainingRecord[],
  barriers: Barrier[] = []
): ClassificationResult {
  const texto = `${descripcion} ${causa}`
  const peligro = classifyPeligro(texto)
  const { code: ataCode, sign: ataSign } = classifyATA(texto)
  const tipoReporte = classifyTipo(texto)
  const { likelyhood: likeText, severity } = classifyRisk(texto)

  const { efectividad_global, likelyhood: likeBarriers } = barriersToProbability(barriers)
  const likelyhood = likeBarriers || likeText

  const riskRow = riskMatrix.find(r => r.severity === severity && r.likelyhood === likelyhood)
  const riskInd   = riskRow?.riskInd ?? 100
  const riskAlarp = riskRow?.alarp ?? 'Riesgo Medio'
  const spi = getSPIForPeligro(peligro, descripcion)
  const { area_gestora, responsable } = localAreaGestora(peligro, '')

  return {
    tipo_reporte: tipoReporte,
    peligro_generico: peligro,
    ata_100: ataCode, ata_sign: ataSign,
    likelyhood, severity_c: severity,
    risk_ind: riskInd, risk_alarp: riskAlarp,
    indicadores_spi: spi,
    confidence: 0.65, method: 'ml-local',
    efectividad_global: efectividad_global >= 0 ? efectividad_global : undefined,
    likelyhood_from_barriers: likeBarriers || undefined,
    justificacion_severidad: `Peor Condición Real Previsible (PCRP): el evento afecta principalmente la categoría "${peligro.split(' - ')[0]}", con impacto estimado en criterios de regulación y aeronave. Severidad asignada: ${severity}.`,
    justificacion_probabilidad: likeBarriers
      ? `Efectividad global de barreras: ${efectividad_global}% → Probabilidad resultante: ${likeBarriers}.`
      : `Sin barreras evaluadas. Probabilidad asignada por heurística de texto: ${likelyhood}.`,
    area_gestora,
    responsable_sugerido: responsable,
    plan_gestion: localPlan(peligro),
  }
}

// ─── Clasificador con Claude API ──────────────────────────────────────────────
export async function classifyWithClaude(
  descripcion: string,
  causa: string,
  training: TrainingRecord[],
  barriers: Barrier[] = []
): Promise<ClassificationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return classifyLocal(descripcion, causa, training, barriers)

  const examples = training
    .filter(r => r.peligro_generico && r.peligro_generico !== 'None')
    .slice(0, 15)
    .map(r => `Descripción: "${r.texto.substring(0, 200)}"
→ Tipo: ${r.tipo_reporte} | Peligro: ${r.peligro_generico} | ATA: ${r.ata || 'N/A'} | Likelyhood: ${r.likelyhood} | Severity: ${r.severity}`)
    .join('\n')

  const { efectividad_global, likelyhood: likeBarriers } = barriersToProbability(barriers)
  const barrierSection = barriers.length
    ? `\nDEFENSAS VIGENTES (clasificadas T=Tecnología, R=Reglamentación, E=Entrenamiento, O=Otro):
${barriers.map(b => `- [${b.tipo}] ${b.nombre} — Efectividad: ${b.efectividad}%`).join('\n')}
Efectividad global calculada: ${efectividad_global}%
Probabilidad sugerida por barreras: ${likeBarriers || 'sin calcular'}

INSTRUCCIÓN: la probabilidad debe basarse PRINCIPALMENTE en la efectividad de las barreras anteriores, no en la frecuencia histórica.`
    : '\nNOTA: No se listaron barreras. Determina la probabilidad con base en las defensas implícitas mencionadas en el texto.'

  const prompt = `Eres experto en Seguridad Operacional (SMS) de una OMA (Organización de Mantenimiento de Aeronaves). Usas la metodología ARMS adaptada.

EJEMPLOS HISTÓRICOS:
${examples}
---
REPORTE A ANALIZAR:
Descripción: "${descripcion}"
Causa Probable: "${causa}"
${barrierSection}

OPCIONES VÁLIDAS:
Tipo Reporte: Reactivo | Proactivo
Peligro Genérico: ALM | DGA | DOC | FH | FOD | GAR | GH | HAN | HER | MDA | PRO (usar el nombre completo)
Likelyhood: Frecuente | Probable | Ocasional | Improbable | Sumamente Improbable
Severity C: Catastrofico | Peligroso | Importante | Leve | Insignificante
Severity PCRP por criterio: uno de los 5 niveles anteriores para cada criterio

Responde ÚNICAMENTE con JSON válido (sin markdown):
{
  "tipo_reporte": "...",
  "peligro_generico": "... (nombre completo)",
  "ata_100": "ATA_XX o vacío",
  "ata_sign": "descripción ATA o vacío",
  "likelyhood": "...",
  "severity_c": "... (peor PCRP confirmado)",
  "severity_pcrp": {
    "aeronave": "...", "personas": "...", "regulacion": "...",
    "reputacion": "...", "ambiente": "...", "peor": "..."
  },
  "justificacion_severidad": "2-3 oraciones explicando la severidad PCRP",
  "justificacion_probabilidad": "2-3 oraciones sobre la probabilidad y efectividad de barreras",
  "area_gestora": "área responsable de gestionar el reporte",
  "responsable_sugerido": "cargo del responsable sugerido",
  "plan_gestion": "plan orientativo de 4 pasos (usar \\n entre pasos)"
}`

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const p = JSON.parse(jsonMatch[0])

    const riskRow = riskMatrix.find(r => r.severity === p.severity_c && r.likelyhood === p.likelyhood)
    const riskInd   = riskRow?.riskInd ?? 100
    const riskAlarp = riskRow?.alarp ?? 'Riesgo Medio'
    const spi = getSPIForPeligro(p.peligro_generico, descripcion)

    return {
      tipo_reporte:     p.tipo_reporte,
      peligro_generico: p.peligro_generico,
      ata_100:  p.ata_100  ?? '', ata_sign: p.ata_sign ?? '',
      likelyhood: p.likelyhood, severity_c: p.severity_c,
      risk_ind: riskInd, risk_alarp: riskAlarp,
      indicadores_spi: spi,
      confidence: 0.92, method: 'claude-api',
      severity_pcrp: p.severity_pcrp,
      efectividad_global: efectividad_global >= 0 ? efectividad_global : undefined,
      likelyhood_from_barriers: likeBarriers || undefined,
      justificacion_severidad:    p.justificacion_severidad,
      justificacion_probabilidad: p.justificacion_probabilidad,
      area_gestora:          p.area_gestora,
      responsable_sugerido:  p.responsable_sugerido,
      plan_gestion:          p.plan_gestion,
    }
  } catch {
    return classifyLocal(descripcion, causa, training, barriers)
  }
}
