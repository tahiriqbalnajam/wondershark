/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // for React
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: "#FF5B49",
          light: "#FFCCD9",
        },
      },
    },
  },
  plugins: [],
}
