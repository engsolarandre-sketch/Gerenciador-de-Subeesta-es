/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#01696f',
          hover:   '#0c4e54',
          active:  '#0f3638',
          highlight: '#cedcd8',
        },
      },
    },
  },
  plugins: [],
}