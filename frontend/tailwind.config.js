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
          yellowLight: "#FFE55C",
          yellowDark: "#E6C200",
          dark: "#0A0A0A",
          darker: "#000000",
          gray: "#1A1A1A",
          grayLight: "#2A2A2A",
          grayLighter: "#3A3A3A",
          accent: "#1A1A1A",
          white: "#FFFFFF",
          offWhite: "#F5F5F5"
        }
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #FFD600 0%, #E6C200 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #FFE55C 0%, #FFD600 100%)',
        'gradient-accent': 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
        'gradient-dark': 'linear-gradient(135deg, #000000 0%, #0A0A0A 100%)',
        'gradient-gold': 'linear-gradient(135deg, #FFD600 0%, #FFE55C 100%)',
        'gradient-modern': 'linear-gradient(135deg, #FFD600 0%, #E6C200 50%, #FFE55C 100%)',
        'gradient-yellow': 'linear-gradient(135deg, #FFD600 0%, #FFE55C 100%)',
        'gradient-gray': 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
        'gradient-black': 'linear-gradient(135deg, #000000 0%, #0A0A0A 100%)'
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-in-up': 'slideInUp 0.6s ease-out',
        'fade-in-scale': 'fadeInScale 0.5s ease-out',
        'shimmer': 'shimmer 1.5s infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(102, 126, 234, 0.6)' }
        },
        slideInUp: {
          from: {
            opacity: '0',
            transform: 'translateY(30px)'
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        fadeInScale: {
          from: {
            opacity: '0',
            transform: 'scale(0.9)'
          },
          to: {
            opacity: '1',
            transform: 'scale(1)'
          }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'soft': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glow': '0 0 20px rgba(255, 214, 0, 0.4)',
        'glow-yellow': '0 0 20px rgba(255, 214, 0, 0.5)',
        'glow-dark': '0 0 20px rgba(0, 0, 0, 0.5)'
      }
    },
  },
  plugins: [],
} 