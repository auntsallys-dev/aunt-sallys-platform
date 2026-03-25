import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { authRoutes } from "./routes/auth.js";
import { ordersRoutes } from "./routes/orders.js";
import { servicesRoutes } from "./routes/services.js";
import { branchesRoutes } from "./routes/branches.js";
import { customersRoutes } from "./routes/customers.js";
import { paymentsRoutes } from "./routes/payments.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

export const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// API routes
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/orders", ordersRoutes);
app.route("/api/v1/services", servicesRoutes);
app.route("/api/v1/branches", branchesRoutes);
app.route("/api/v1/customers", customersRoutes);
app.route("/api/v1/payments", paymentsRoutes);

// Serve static POS frontend
app.use("/assets/*", serveStatic({ root: "./public" }));

// SPA fallback: serve index.html for all non-API routes
app.get("*", (c) => {
  try {
    const html = readFileSync(join(process.cwd(), "public", "index.html"), "utf-8");
    return c.html(html);
  } catch {
    return c.json({ error: "POS frontend not built" }, 404);
  }
});

export default app;
