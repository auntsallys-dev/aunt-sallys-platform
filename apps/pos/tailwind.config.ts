import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdfc",
          100: "#ccfbf8",
          200: "#99f6f1",
          300: "#5eecea",
          400: "#2dd4d0",
          500: "#0abab5",
          600: "#0abab5",
          700: "#0a9a96",
          800: "#0d7a77",
          900: "#0f6462",
        },
      },
    },
  },
  plugins: [],
};

export default config;
