/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 900: "var(--ink-900)", DEFAULT: "#141a15" },
        pine: {
          950: "#06231b",
          900: "#0c3b2e",
          700: "#14503d",
          100: "#e6eee6",
        },
        brass: {
          600: "#a97828",
          500: "#b9862f",
          100: "#f5ead0",
        },
        cream: { DEFAULT: "#faf6ec", deep: "#f2ecdc" },
        clay: "#5f6e64",
        line: "#e3ddcc",
        proof: { 600: "var(--proof-600)", 100: "var(--proof-100)" },
        sun: { 500: "var(--sun-500)", 100: "var(--sun-100)" },
        coral: { 500: "var(--coral-500)", 100: "var(--coral-100)" },
        sky: { 500: "var(--sky-500)", 100: "var(--sky-100)" },
        sand: { 100: "var(--sand-100)" },
        slate2: "var(--slate-200)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "22px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,26,21,0.05), 0 12px 32px -12px rgba(20,26,21,0.18)",
        raised: "0 2px 4px rgba(20,26,21,0.06), 0 24px 48px -16px rgba(20,26,21,0.28)",
      },
    },
  },
  plugins: [],
};
