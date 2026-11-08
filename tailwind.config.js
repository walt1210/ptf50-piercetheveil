/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#0a0a0a', // Deepest background
          dark: '#141010', // Slightly lighter panel background
          blood: '#5c0a0a', // Deep crimson accent
          cream: '#fdfbf7', // Off-white text
          muted: '#8c7b7b', // Secondary text
          gold: '#d4af37',
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}