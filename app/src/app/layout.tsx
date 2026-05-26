import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SMS OMA — Sistema de Gestión de Seguridad',
  description: 'Clasificador predictivo y análisis de reportes del Sistema de Gestión de Seguridad Operacional',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
