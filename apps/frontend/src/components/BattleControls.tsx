import { useState } from "react";
import { motion } from "framer-motion";
import { TypeBadge } from "./TypeBadge";
import { typeColor } from "../lib/types";

interface Props {
  battle: any;
  myPlayerId: string;
  onMove: (i: number) => void;
  onSwitch: (i: number) => void;
  waiting: boolean;
}

export function BattleControls({ battle, myPlayerId, onMove, onSwitch, waiting }: Props) {
  const me = battle.players.find((p: any) => p.id === myPlayerId);
  const active = me.team[me.activeIndex];
  const [mode, setMode] = useState<"main" | "switch">("main");

  if (waiting) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <span className="muted">Esperando al rival...</span>
      </div>
    );
  }

  if (active.fainted) {
    return (
      <div className="card">
        <p style={{ marginBottom: "1rem", fontWeight: 600 }}>¡{active.name} se debilitó! Elige el siguiente:</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
          {me.team.map((p: any, i: number) =>
            p.fainted || i === me.activeIndex ? null : (
              <button key={i} className="btn btn-secondary" onClick={() => onSwitch(i)}>
                {p.name}
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  if (mode === "switch") {
    return (
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          <strong>Cambiar Pokémon</strong>
          <button onClick={() => setMode("main")} className="muted">← Volver</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
          {me.team.map((p: any, i: number) => (
            <button
              key={i}
              className="move-btn"
              disabled={p.fainted || i === me.activeIndex}
              onClick={() => {
                onSwitch(i);
                setMode("main");
              }}
              style={{ opacity: p.fainted || i === me.activeIndex ? 0.4 : 1, cursor: p.fainted || i === me.activeIndex ? "not-allowed" : "pointer" }}
            >
              <div className="move-name">{p.name}</div>
              <div className="move-meta">
                HP {p.currentHp}/{p.maxHp}
                {p.status?.kind && <span className={`status-badge ${p.status.kind}`}>{p.status.kind}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="move-grid" style={{ marginBottom: "1rem" }}>
        {active.moves.map((m: any, i: number) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="move-btn"
            onClick={() => onMove(i)}
            style={{ borderLeft: `4px solid ${typeColor(m.type)}` }}
          >
            <div className="move-name">{m.name}</div>
            <div className="move-meta">
              <TypeBadge type={m.type} />
              <span>{m.damageClass}</span>
              {m.power > 0 && <span>Pow {m.power}</span>}
              <span>Acc {m.accuracy}</span>
            </div>
          </motion.button>
        ))}
      </div>
      <button className="btn btn-secondary" onClick={() => setMode("switch")} style={{ width: "100%" }}>
        Cambiar Pokémon
      </button>
    </div>
  );
}
