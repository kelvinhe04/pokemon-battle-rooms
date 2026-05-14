import { Hono } from "hono";
import { connectDb } from "./db";
import { pokemonRouter } from "./routes/pokemon";
import { roomsRouter } from "./routes/rooms";
import { battlesRouter } from "./routes/battles";
import { loadTypeChart } from "./battle/types";
import { joinRoom, leaveRoom } from "./ws/hub";

const PORT = parseInt(process.env.PORT || "3001");

const app = new Hono();

// CORS
app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (c.req.method === "OPTIONS") return c.text("", 204);
  await next();
});

app.get("/", (c) => c.json({ ok: true, service: "pokemon-battle-rooms" }));
app.get("/health", (c) => c.json({ ok: true }));

app.route("/api/pokemon", pokemonRouter);
app.route("/api/rooms", roomsRouter);
app.route("/api/battles", battlesRouter);

await connectDb();
await loadTypeChart();

// Bun server with WebSocket upgrade for /ws/rooms/:code?playerId=...
Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/ws/rooms/")) {
      const roomCode = url.pathname.split("/").pop()!.toUpperCase();
      const playerId = url.searchParams.get("playerId") || "";
      const ok = server.upgrade(req, { data: { roomCode, playerId } });
      if (ok) return undefined;
      return new Response("Upgrade failed", { status: 400 });
    }
    return app.fetch(req);
  },
  websocket: {
    open(ws) {
      joinRoom(ws as any);
      ws.send(JSON.stringify({ event: "ws:connected", payload: { roomCode: (ws as any).data.roomCode } }));
    },
    message(_ws, _msg) {
      // we use server-pushed events only; client does not send messages here
    },
    close(ws) {
      leaveRoom(ws as any);
    },
  },
});

console.log(`✓ Backend running on http://localhost:${PORT}`);
