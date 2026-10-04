/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0e0e10',
        surface: '#161618',
        surface2: '#1e1e21',
        surface3: '#28282c',
        border: '#2a2a2f',
        'border-light': '#34343a',
        accent: '#4e8cff',
        muted: '#8a8a92',
        subtle: '#6b6b72',
      },
      boxShadow: {
        panel: '0 12px 40px rgba(0,0,0,.45)',
        soft: '0 4px 20px rgba(0,0,0,.3)',
      },
      borderRadius: {
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
      },
    },
  },
  plugins: [],
}
