# SMS OMA — Sistema de Gestión de Seguridad

Sistema web para la gestión, clasificación predictiva y análisis de reportes SMS de la
Organización de Mantenimiento de Aeronaves (OMA) de SATENA.

## 🚀 Acceso rápido

- **URL producción:** `https://sms-oma.vercel.app` *(una vez desplegado)*
- **Usuario:** `sms_oma`
- **Contraseña:** configurada en variables de entorno Vercel

---

## 📦 Módulos

| Módulo | Descripción |
|---|---|
| **Dashboard** | KPIs, gráficos de distribución y tendencias por año |
| **Clasificador IA** | Clasifica nuevos reportes usando ML o Claude API |
| **Revisión 2026** | 70 registros 2026 con 120 correcciones marcadas en rojo |
| **Análisis Factores** | Factores comunes, planes de acción y tendencias SPI |
| **Base de Datos** | Tabla filtrable de todos los registros 2023–2026 |

---

## 🛠 Stack tecnológico

- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** TailwindCSS
- **Gráficos:** Recharts
- **Auth:** NextAuth.js v5
- **IA (opcional):** Anthropic Claude claude-haiku-4-5
- **Despliegue:** Vercel

---

## ⚙️ Despliegue en Vercel

### 1. Variables de entorno (configurar en Vercel Dashboard)

```
AUTH_SECRET=<cadena aleatoria de 32+ caracteres>
APP_USERNAME=sms_oma
APP_PASSWORD=seguridad2026
ANTHROPIC_API_KEY=sk-ant-...  # opcional pero recomendado
```

### 2. Pasos

1. Haz push de este repositorio a GitHub
2. En [vercel.com](https://vercel.com) → **New Project** → importa el repo
3. Set **Root Directory** → `app`
4. Agrega las variables de entorno
5. **Deploy** → ¡listo!

---

## 🏠 Desarrollo local

```bash
# Requiere Node.js 18+
cd app
npm install
cp .env.example .env.local   # edita con tus valores
npm run dev
# → http://localhost:3000
```

---

## 📊 Archivos generados

| Archivo | Descripción |
|---|---|
| `output/BBDD_SMS_OMA_Corregida.xlsx` | BD completa con correcciones 2026 en rojo |
| `output/Analisis_Factores_Comunes.xlsx` | Análisis exhaustivo de factores |
| `data/*.json` | Datos procesados para la app web |

---

## 📋 Correcciones 2026

- **120 campos** corregidos en **67 de 70 registros**
- Campos corregidos: Tipo Reporte (5), Peligro Genérico (14), ATA_100 (11),
  Indicadores SPI (~35), Conciencia del Error (~40)
- Ver bitácora completa en la app → **Revisión 2026**
