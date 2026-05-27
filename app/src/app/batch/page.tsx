import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import BatchClient from './BatchClient'

export default async function BatchPage() {
  const session = await auth()
  if (!session) redirect('/login')
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Clasificación por Lote</h1>
          <p className="text-gray-500 text-sm mt-1">
            Carga un Excel o CSV con múltiples reportes · La IA clasifica cada uno · Exporta el resultado
          </p>
        </div>
        <BatchClient />
      </main>
    </div>
  )
}
