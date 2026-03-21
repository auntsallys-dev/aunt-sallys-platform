import type { Config } from "tailwindcss";
import sharedConfig from "@aunt-sallys/ui/tailwind";

const config: Config = {
  ...sharedConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
