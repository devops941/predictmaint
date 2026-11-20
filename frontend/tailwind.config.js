/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        plate: 'var(--plate)',
        sheet: 'var(--sheet)',
        graphite: 'var(--graphite)',
        'graphite-2': 'var(--graphite-2)',
        'graphite-3': 'var(--graphite-3)',
        line: 'var(--line)',
        hivis: 'var(--hivis)',
        'hivis-deep': 'var(--hivis-deep)',
        'hivis-wash': 'var(--hivis-wash)',
        steel: 'var(--steel)',
        'steel-wash': 'var(--steel-wash)',
        'series-d': 'var(--series-d)',
        watch: 'var(--watch)',
        fault: 'var(--fault)',
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'sans-serif'],
        sans: ['"Barlow"', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '8px',
      },
    },
  },
  plugins: [],
}
