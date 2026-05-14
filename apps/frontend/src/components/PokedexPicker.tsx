import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { TypeBadge } from "./TypeBadge";

interface Props {
  bannedIds: number[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  maxSelected?: number;
  banMode?: boolean; // when true, used in banning phase
  disabled?: boolean;
}

export function PokedexPicker({
  bannedIds,
  selectedIds,
  onToggle,
  maxSelected = 6,
  banMode = false,
  disabled = false,
}: Props) {
  const [list, setList] = useState<any[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.pokemonList("", "").then((d) => {
      if (alive) {
        setList(d);
        setLoading(false);
      }
    });
    api.pokemonTypes().then((t) => alive && setTypes(t));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return list.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (type && !p.types.includes(type)) return false;
      return true;
    });
  }, [list, q, type]);

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          placeholder="Buscar Pokémon..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--card-border)",
            background: "var(--card)",
            color: "var(--text)",
          }}
        >
          <option value="">Todos los tipos</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>Cargando Pokédex...</div>
      ) : (
        <div className="pokedex-grid">
          {filtered.map((p) => {
            const banned = bannedIds.includes(p.pokedexId);
            const selected = selectedIds.includes(p.pokedexId);
            const atMax = !selected && selectedIds.length >= maxSelected;
            const cls = `poke-card ${selected ? "selected" : ""} ${banned ? "banned" : ""}`;
            return (
              <motion.div
                key={p.pokedexId}
                whileHover={{ scale: banned || disabled ? 1 : 1.04 }}
                className={cls}
                onClick={() => {
                  if (banned || disabled) return;
                  if (atMax && !banMode) return;
                  onToggle(p.pokedexId);
                }}
              >
                <img
                  src={p.spriteAnimatedFront || p.spriteFront}
                  alt={p.name}
                  loading="lazy"
                />
                <div className="name">
                  #{p.pokedexId} {p.name}
                  {p.isLegendary && <span style={{ color: "var(--accent)" }}> ★</span>}
                </div>
                <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 4 }}>
                  {p.types.map((t: string) => (
                    <TypeBadge key={t} type={t} />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
