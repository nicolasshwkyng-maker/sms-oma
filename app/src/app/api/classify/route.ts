import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { classifyWithClaude, classifyLocal } from '@/lib/classifier'
import { trainingData } from '@/lib/data'
import type { Barrier } from '@/lib/types'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { descripcion, causa, barriers = [] } = body as {
    descripcion: string; causa: string; barriers?: Barrier[]
  }

  if (!descripcion) return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 })

  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY)
  const result = hasApiKey
    ? await classifyWithClaude(descripcion, causa ?? '', trainingData, barriers)
    : classifyLocal(descripcion, causa ?? '', trainingData, barriers)

  return NextResponse.json({ result, hasApiKey })
}
