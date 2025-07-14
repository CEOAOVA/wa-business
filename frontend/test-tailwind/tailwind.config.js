/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        embler: {
          yellow: "#FFD600",
          dark: "#18191A",
          gray: "#23272F",
          accent: "#1A1B1E"
        }
      }
    },
  },
  plugins: [],
} 