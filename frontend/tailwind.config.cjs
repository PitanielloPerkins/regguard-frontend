/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
        purple: {
          900: '#2e1065',
          800: '#4c1d95',
          700: '#6d28d9',
          600: '#7c3aed',
          500: '#a855f7',
          400: '#c084fc',
          300: '#d8b4fe',
        },
        blue: {
          600: '#2563eb',
          500: '#3b82f6',
          400: '#60a5fa',
          300: '#93c5fd',
        },
        emerald: {
          600: '#059669',
          500: '#10b981',
          400: '#34d399',
          300: '#6ee7b7',
        },
        green: {
          400: '#4ade80',
        },
        indigo: {
          600: '#4f46e5',
          500: '#6366f1',
          400: '#818cf8',
          300: '#a5b4fc',
        },
        pink: {
          600: '#ec4899',
          500: '#f43f5e',
        },
      },
    },
  },
  plugins: [],
}
