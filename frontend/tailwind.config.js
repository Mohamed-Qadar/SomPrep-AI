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
          bg: '#0f172a',        // Deep Slate main background
          card: '#1e293b',      // Card and panel slate
          border: '#334155',    // Borders
          indigo: '#6366f1',    // Indigo accent
          emerald: '#10b981',   // Emerald green accent for gamification
          primary: '#6366f1',   // Map primary to vibrant indigo
          success: '#10b981',   // Map success to emerald green
          warning: '#f59e0b',   // Warning amber
          danger: '#ef4444',    // Danger red
          muted: '#94a3b8',     // Muted text slate
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
