import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { saveSession } from "../lib/session";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return setError("Pon tu nombre");
    setBusy(true);
    setError(null);
    try {
      const r = await api.createRoom(name.trim());
      saveSession({ code: r.code, playerId: r.playerId, name: name.trim() });
      navigate({ to: "/room/$code", params: { code: r.code } });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) return setError("Pon tu nombre");
    if (!code.trim()) return setError("Pon el código");
    setBusy(true);
    setError(null);
    try {
      const r = await api.joinRoom(code.trim().toUpperCase(), name.trim());
      saveSession({ code: r.code, playerId: r.playerId, name: name.trim() });
      navigate({ to: "/room/$code", params: { code: r.code } });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "2rem" }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ textAlign: "center" }}
      >
        <h1 className="title" style={{ fontSize: "4rem" }}>Pokémon Battle Rooms</h1>
        <p className="muted">Combate 1v1 online · Crea o únete a una sala</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="card"
        style={{ width: "100%", maxWidth: 480 }}
      >
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Tu nombre</label>
          <input
            type="text"
            placeholder="Ash Ketchum"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%" }}
            maxLength={20}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <button className="btn" style={{ flex: 1 }} onClick={handleCreate} disabled={busy}>
            Crear sala
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", margin: "1.5rem 0", gap: "1rem" }}>
          <div style={{ flex: 1, height: 1, background: "var(--card-border)" }} />
          <span className="muted">o</span>
          <div style={{ flex: 1, height: 1, background: "var(--card-border)" }} />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Código de sala</label>
          <input
            type="text"
            placeholder="ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{ width: "100%", textTransform: "uppercase", letterSpacing: "0.2em", textAlign: "center", fontSize: "1.5rem" }}
            maxLength={6}
          />
        </div>

        <button className="btn btn-secondary" style={{ width: "100%" }} onClick={handleJoin} disabled={busy}>
          Unirse a sala
        </button>

        {error && <p style={{ color: "var(--red)", marginTop: "1rem", textAlign: "center" }}>{error}</p>}
      </motion.div>
    </div>
  );
}
