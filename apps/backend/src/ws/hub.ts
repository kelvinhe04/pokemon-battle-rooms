// WebSocket hub: rooms -> set of sockets
import type { ServerWebSocket } from "bun";

interface ClientData {
  roomCode: string;
  playerId: string;
}

const rooms = new Map<string, Set<ServerWebSocket<ClientData>>>();

export function joinRoom(ws: ServerWebSocket<ClientData>) {
  const set = rooms.get(ws.data.roomCode) ?? new Set();
  set.add(ws);
  rooms.set(ws.data.roomCode, set);
}

export function leaveRoom(ws: ServerWebSocket<ClientData>) {
  const set = rooms.get(ws.data.roomCode);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) rooms.delete(ws.data.roomCode);
}

export function broadcast(roomCode: string, event: string, payload: any) {
  const set = rooms.get(roomCode);
  if (!set) return;
  const msg = JSON.stringify({ event, payload });
  for (const ws of set) {
    try {
      ws.send(msg);
    } catch {}
  }
}
