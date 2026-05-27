import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef3fb',
          100: '#d5e2f5',
          200: '#adc5eb',
          300: '#7aa0dd',
          400: '#4e7bcd',
          500: '#2e5fb3',
          600: '#1f4e79',
          700: '#183d60',
          800: '#122d47',
          900: '#0c1e30',
        },
        risk: {
          extremo: '#c00000',
          alto:    '#ed7d31',
          medio:   '#ffc000',
          bajo:    '#70ad47',
        }
      },
    },
  },
  plugins: [],
}
export default config
