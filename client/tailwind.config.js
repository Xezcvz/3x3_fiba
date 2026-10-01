/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // สีฟ้าหลัก (ปุ่ม, ลิงก์, ไฮไลต์)
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        base: {
          white: '#ffffff',
          gray50: '#f8fafc',
          gray100: '#f1f5f9',
          gray200: '#e2e8f0',
          gray700: '#334155',
          gray900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Noto Sans Thai', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(59, 130, 246, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 25px rgba(59, 130, 246, 0.35)',
      }
    },
  },
  plugins: [],
}
