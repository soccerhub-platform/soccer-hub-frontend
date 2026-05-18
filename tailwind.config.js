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
          50: '#eef8f5',
          100: '#d8f0e9',
          200: '#aee0d4',
          500: '#0f766e',
          600: '#0d665f',
          700: '#134e4a',
          800: '#123f3d',
          900: '#0b2f2d',
        },
      },
    },
  },
  plugins: [],
};
