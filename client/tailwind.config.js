/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Same values as the CSS variables in index.css; listed here so opacity modifiers (bg-ink/25) work.
      colors: {
        ink: '#2a1c10',
        paper: '#efe3c6',
        brass: '#d6a649',
        blood: '#b3261e',
        analyst: '#5cc2e6',
      },
    },
  },
  plugins: [],
};
