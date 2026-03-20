/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#8B5CF6',
          'purple-dim': '#7C3AED',
          accent: '#818CF8',
          neon: '#39FF14',
          dark: '#0F172A',
          surface: '#1E293B',
          border: '#334155',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
