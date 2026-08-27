/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        dark: {
          bg: '#0A0A1A',
          card: '#111827',
          elevated: '#1F2937',
          border: '#374151',
          text: '#F9FAFB',
          muted: '#9CA3AF',
        }
      }
    },
  },
  plugins: [],
}
