/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:        '#0f2557',
        'navy-dark': '#071435',
        'navy-light':'#1a3d7c',
        gold:        '#C9A84C',
        teal:        '#0e7490',
      },
      fontFamily: {
        playfair: ['"Playfair Display"', 'Georgia', 'serif'],
        inter:    ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};