import "dotenv/config";
import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { app } from "./app.js";
import { wsManager } from "./ws-manager.js";
import { startBackupScheduler } from "./jobs/scheduler.js";

const port = parseInt(process.env.PORT ?? process.env.API_PORT ?? "3001", 10);

const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`API server running at http://localhost:${port}`);
});

// Nightly encrypted DB backup (BIR EOPT 10-year retention). No-op unless
// BACKUP_ENC_KEY is set — see jobs/scheduler.ts.
startBackupScheduler();

// WebSocket server attached to the same HTTP server
// Clients connect to: ws://host/api/v1/ws/{channel}
// Channel examples: "branch:{id}:drivers", "order:{id}:driver"
const wss = new WebSocketServer({ noServer: true });

(server as any).on("upgrade", (request: any, socket: any, head: any) => {
  const url = request.url ?? "";
  if (!url.startsWith("/api/v1/ws/")) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", (ws, request: any) => {
  const url = request.url ?? "";
  const channel = decodeURIComponent(url.replace("/api/v1/ws/", ""));
  wsManager.subscribe(channel, ws);

  ws.on("close", () => {
    wsManager.unsubscribe(channel, ws);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });
});

console.log(`WebSocket server ready at ws://localhost:${port}/api/v1/ws/{channel}`);
