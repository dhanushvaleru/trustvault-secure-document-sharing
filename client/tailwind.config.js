/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          950: "#080c14",
          900: "#0d1527",
          850: "#111c33",
          800: "#162444",
          700: "#1e335e",
          600: "#27437c",
          500: "#325aa3",
          400: "#497bd4",
          300: "#7da2e6",
          200: "#b5ccf5",
          100: "#e1ecfc",
          50: "#f4f8fe",
        },
      },
    },
  },
  plugins: [],
};
