import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth.js";
import { ordersRoutes } from "./routes/orders.js";
import { servicesRoutes } from "./routes/services.js";
import { branchesRoutes } from "./routes/branches.js";
import { customersRoutes } from "./routes/customers.js";
import { paymentsRoutes } from "./routes/payments.js";

export const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/orders", ordersRoutes);
app.route("/api/v1/services", servicesRoutes);
app.route("/api/v1/branches", branchesRoutes);
app.route("/api/v1/customers", customersRoutes);
app.route("/api/v1/payments", paymentsRoutes);

export default app;
