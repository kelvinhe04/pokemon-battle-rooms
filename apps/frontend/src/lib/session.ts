// Persist player session per room for reconnection bonus
const KEY = "pbr_sessions";

type Session = { code: string; playerId: string; name: string };

function read(): Session[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSession(s: Session) {
  const all = read().filter((x) => x.code !== s.code);
  all.push(s);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function loadSession(code: string): Session | null {
  return read().find((x) => x.code === code) || null;
}

export function clearSession(code: string) {
  const all = read().filter((x) => x.code !== code);
  localStorage.setItem(KEY, JSON.stringify(all));
}
