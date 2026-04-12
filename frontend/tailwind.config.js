/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E8F4FB',
          100: '#CCE7F6',
          200: '#99CEF0',
          300: '#66B5E9',
          400: '#3A9BDC',
          500: '#2E7DB3',
          600: '#235E8A',
          700: '#184060',
          800: '#0C2137',
        },
        accent: {
          50: '#FFF4E6',
          100: '#FFE5CC',
          200: '#FFCB99',
          300: '#FFB166',
          400: '#FF9F43',
          500: '#E68A2E',
          600: '#B36B23',
        }
      },
      animation: {
        'shake': 'shake 0.4s ease-in-out 0s 2 alternate',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        }
      }
    },
  },
  plugins: [],
}

