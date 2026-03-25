import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    // Apps consuming this package should extend content with their own paths
  ],
  theme: {
    extend: {
      colors: {
        // Aunt Sally's brand palette — Tiffany blue
        brand: {
          50:  "#e6faf9",
          100: "#c2f2f1",
          200: "#85e5e3",
          300: "#47d8d5",
          400: "#1ac9c6",
          500: "#0abab5",
          600: "#089a96",
          700: "#067a77",
          800: "#045957",
          900: "#023836",
          950: "#011c1b",
        },
      },
      fontFamily: {
        sans:    ["var(--font-inter)",     "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-cormorant)", "Georgia",       "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
