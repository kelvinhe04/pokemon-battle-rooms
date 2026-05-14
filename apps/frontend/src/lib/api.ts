const API = (typeof window !== "undefined" && (window as any).__API__) || import.meta.env.VITE_API_URL || "http://localhost:3001";

async function req(path: string, init?: RequestInit) {
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
}

export const api = {
  createRoom: (name: string) => req("/api/rooms", { method: "POST", body: JSON.stringify({ name }) }),
  joinRoom: (code: string, name: string) =>
    req(`/api/rooms/${code}/join`, { method: "POST", body: JSON.stringify({ name }) }),
  getRoom: (code: string) => req(`/api/rooms/${code}`),
  ready: (code: string, playerId: string, ready: boolean) =>
    req(`/api/rooms/${code}/ready`, { method: "POST", body: JSON.stringify({ playerId, ready }) }),
  ban: (code: string, playerId: string, pokedexId: number) =>
    req(`/api/rooms/${code}/ban`, { method: "POST", body: JSON.stringify({ playerId, pokedexId }) }),
  setTeam: (code: string, playerId: string, pokedexIds: number[]) =>
    req(`/api/rooms/${code}/team`, { method: "POST", body: JSON.stringify({ playerId, pokedexIds }) }),
  pokemonList: (q = "", type = "") => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (type) sp.set("type", type);
    return req(`/api/pokemon?${sp.toString()}`);
  },
  pokemonTypes: () => req("/api/pokemon/types/all"),
  battle: (id: string) => req(`/api/battles/${id}`),
  battleAction: (id: string, playerId: string, action: any) =>
    req(`/api/battles/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ playerId, action }),
    }),
};
