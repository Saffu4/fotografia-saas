/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        panel: {
          bg: '#0b1220',
          card: '#111a2e',
          border: '#1e293b',
          orange: '#f97316',
          blue: '#3b82f6',
          green: '#22c55e',
        }
      }
    },
  },
  plugins: [],
}
