import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ValuacionClient from './ValuacionClient'

export default async function ValuacionPage() {
  const session = await auth()
  if (!session) redirect('/login')
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Valoración de Riesgo</h1>
          <p className="text-gray-500 text-sm mt-1">
            Evaluación ARMS — Severidad PCRP · Barreras · Probabilidad · Índice de Riesgo
          </p>
        </div>
        <ValuacionClient />
      </main>
    </div>
  )
}
