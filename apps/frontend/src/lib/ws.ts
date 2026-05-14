const WS = (import.meta.env.VITE_WS_URL || "ws://localhost:3001").replace(/\/$/, "");

export function connectRoomWS(
  code: string,
  playerId: string,
  onEvent: (event: string, payload: any) => void
): WebSocket {
  const ws = new WebSocket(`${WS}/ws/rooms/${code}?playerId=${encodeURIComponent(playerId)}`);
  ws.onmessage = (e) => {
    try {
      const { event, payload } = JSON.parse(e.data);
      onEvent(event, payload);
    } catch {}
  };
  return ws;
}
