/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brandBg1: "#1f2746",
        brandBg2: "#2a5061",
      },
      boxShadow: {
        card: "0 8px 30px rgba(0,0,0,0.35)",
      }
    },
  },
  plugins: [],
};
