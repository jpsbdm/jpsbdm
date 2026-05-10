import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0F172A',
          2: '#334155',
          3: '#64748B',
        },
        'slate-border': '#E2E8F0',
        surface: '#FFFFFF',
        background: '#F8FAFC',
        teal: {
          DEFAULT: '#0D9488',
          light: '#CCFBF1',
        },
        brand: {
          red: '#E11D48',
          'red-light': '#FEE2E2',
          green: '#16A34A',
          amber: '#D97706',
          purple: '#7C3AED',
          orange: '#EA580C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
