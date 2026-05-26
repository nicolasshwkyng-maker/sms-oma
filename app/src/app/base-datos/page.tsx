import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { allRecords } from '@/lib/data'
import { RISK_BG } from '@/lib/types'
import DatabaseClient from './DatabaseClient'

export default async function BaseDatosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Base de Datos SMS OMA</h1>
          <p className="text-gray-500 text-sm mt-1">
            {allRecords.length} registros · 2023–2026 · Filtros interactivos
          </p>
        </div>
        <DatabaseClient records={allRecords} />
      </main>
    </div>
  )
}
