import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SMS OMA — Sistema de Gestión de Seguridad',
  description: 'Clasificador predictivo y análisis de reportes SMS para la Organización de Mantenimiento de Aeronaves SATENA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
