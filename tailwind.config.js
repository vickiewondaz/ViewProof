/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 900: "var(--ink-900)" },
        proof: { 600: "var(--proof-600)", 100: "var(--proof-100)" },
        sun: { 500: "var(--sun-500)", 100: "var(--sun-100)" },
        coral: { 500: "var(--coral-500)", 100: "var(--coral-100)" },
        sky: { 500: "var(--sky-500)", 100: "var(--sky-100)" },
        sand: { 100: "var(--sand-100)" },
        slate2: "var(--slate-200)",
      },
    },
  },
  plugins: [],
};
