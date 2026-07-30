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
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#b8dcff',
          500: '#0071e3',
          600: '#0066cc',
          700: '#005bb5',
          800: '#004f9e',
          900: '#003f7f',
        },
      },
    },
  },
  plugins: [],
};
