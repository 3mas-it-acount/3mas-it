/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        svgskin: '#f0b396',
        svgpurple: '#3d224f',
        svglightpink: '#fce8e1',
        svgpeach: '#fddfb1',
        svgwhite: '#fff',
        svgdarkpurple: '#28003a',
        svgred: '#cc2764',
        svgplum: '#3f214c',
      }
    },
  },
  plugins: [],
}
