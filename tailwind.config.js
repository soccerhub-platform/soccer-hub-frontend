/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        dispatcher: {
          100: '#e0f2ff',
          500: '#3b82f6',
          700: '#1e40af',
        },
        admin: {
          100: '#f3e8ff',
          500: '#8b5cf6',
          700: '#5b21b6',
        },
      },
    },
  },
  plugins: [],
};