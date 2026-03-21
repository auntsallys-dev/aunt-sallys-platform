// Bootstrap script for the API server.
// Run with: node --jitless apps/api/start.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("tsx/cjs");
require("./src/index.ts");
