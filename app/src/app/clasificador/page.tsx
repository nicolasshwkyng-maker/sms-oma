import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ClassifierForm from './ClassifierForm'

export default async function ClasificadorPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Clasificador Predictivo</h1>
          <p className="text-gray-500 text-sm mt-1">
            Ingresa la descripción del evento para obtener las clasificaciones SMS automáticas
          </p>
          {!hasApiKey && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Modo ML local activo — Agrega ANTHROPIC_API_KEY en Vercel para activar el motor de IA
            </div>
          )}
          {hasApiKey && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Motor de IA activo — Clasificación de alta precisión
            </div>
          )}
        </div>
        <ClassifierForm />
      </main>
    </div>
  )
}
