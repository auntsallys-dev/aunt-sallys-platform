import type { Config } from "tailwindcss";
import sharedConfig from "@aunt-sallys/ui/tailwind";

const config: Config = {
  ...sharedConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#e6faf9",
          100: "#b3f0ed",
          200: "#80e6e1",
          300: "#4ddcd5",
          400: "#26d4cc",
          500: "#0ABAB5",
          600: "#09a8a3",
          700: "#079691",
          800: "#06847f",
          900: "#04706c",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans:  ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
};

export default config;
