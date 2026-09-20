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
        cyber: {
          bg: '#060A10',
          surface: '#0B111B',
          card: '#0F1826',
          cardHover: '#152236',
          border: 'rgba(6, 182, 212, 0.12)',
          borderFocus: 'rgba(6, 182, 212, 0.5)',
          cyan: '#06B6D4',
          cyanLight: '#22D3EE',
          teal: '#0D9488',
          tealLight: '#14B8A6',
          primary: '#06B6D4',
          primaryLight: '#22D3EE',
          accent: '#8B5CF6',
          muted: '#8E9BAE',
          text: '#F1F5F9',
          critical: '#EF4444',
          high: '#F97316',
          medium: '#EAB308',
          low: '#10B981',
          info: '#06B6D4',
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'glow-teal': '0 0 25px -5px rgba(13, 148, 136, 0.35)',
        'glow-primary': '0 0 25px -5px rgba(6, 182, 212, 0.3)',
        'glow-critical': '0 0 20px -5px rgba(239, 68, 68, 0.3)',
        'glow-high': '0 0 20px -5px rgba(249, 115, 22, 0.3)',
      },
      fontFamily: {
        sans: ['Calibri', '"Segoe UI"', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
