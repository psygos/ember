/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          ember: {
            orange: '#f1502f',
            purple: '#441151',
            darkBg: '#000000',
            lightBg: '#FFFFFF',
            lightGray: '#F8F7FC',
          },
          // Steel blue accent for chat names
          steelblue: '#4682B4',
        },
        fontFamily: {
          sans: ['Inter', 'sans-serif'],
          montserrat: ['Montserrat', 'sans-serif'],
        },
      },
    },
    plugins: [],
  }