import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { TypeBadge } from "./TypeBadge";

interface Props {
  bannedIds: number[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  maxSelected?: number;
  banMode?: boolean;
  disabled?: boolean;
}

function TypeSelect({ types, value, onChange }: { types: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : "Todos los tipos";

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 160 }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%", padding: "0.75rem 1rem", borderRadius: "0.5rem",
          border: "1px solid var(--card-border)", background: "var(--card)",
          color: "var(--text)", display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: "0.5rem", fontSize: "1rem", cursor: "pointer",
        }}
      >
        <span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
          style={{ opacity: 0.6, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <path d="M6 8 L1 3 L11 3 Z" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#1a1f4a", border: "1px solid var(--card-border)",
          borderRadius: "0.5rem", zIndex: 100, maxHeight: 260, overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          {[{ value: "", label: "Todos los tipos" }, ...types.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))].map((opt) => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: "block", width: "100%", padding: "0.6rem 1rem", textAlign: "left",
                background: value === opt.value ? "rgba(255,203,5,0.15)" : "transparent",
                color: value === opt.value ? "var(--accent)" : "var(--text)",
                fontSize: "0.9rem", cursor: "pointer", border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RaritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { value: "", label: "Todos" },
    { value: "normal", label: "⚪ Normales" },
    { value: "legendary", label: "★ Legendarios" },
  ];
  return (
    <div style={{ display: "flex", gap: "0.4rem" }}>
      {options.map((opt) => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          style={{
            padding: "0.5rem 0.85rem", borderRadius: "0.5rem",
            border: value === opt.value ? "1px solid var(--accent)" : "1px solid var(--card-border)",
            background: value === opt.value ? "rgba(255,203,5,0.15)" : "var(--card)",
            color: value === opt.value ? "var(--accent)" : "var(--muted)",
            fontSize: "0.82rem", fontWeight: value === opt.value ? 700 : 400,
            cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
          }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function PokedexPicker({
  bannedIds, selectedIds, onToggle, maxSelected = 6, banMode = false, disabled = false,
}: Props) {
  const [list, setList] = useState<any[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [rarity, setRarity] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.pokemonList("", "").then((d) => { if (alive) { setList(d); setLoading(false); } });
    api.pokemonTypes().then((t) => alive && setTypes(t));
    return () => { alive = false; };
  }, []);

  const selectedLegendaryCount = useMemo(() =>
    list.filter((p) => selectedIds.includes(p.pokedexId) && p.isLegendary).length,
    [list, selectedIds]
  );
  const legendaryMaxed = selectedLegendaryCount >= 1;
  const legendaryTotal = useMemo(() => list.filter((p) => p.isLegendary).length, [list]);

  const filtered = useMemo(() => list.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (type && !p.types.includes(type)) return false;
    if (rarity === "legendary" && !p.isLegendary) return false;
    if (rarity === "normal" && p.isLegendary) return false;
    return true;
  }), [list, q, type, rarity]);

  return (
    <div>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Buscar Pokémon..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        />
        <TypeSelect types={types} value={type} onChange={setType} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <RaritySelect value={rarity} onChange={setRarity} />
        <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          {legendaryTotal} legendarios disponibles
        </span>
        {!banMode && legendaryMaxed && (
          <span style={{
            fontSize: "0.78rem", color: "var(--accent)",
            background: "rgba(255,203,5,0.12)", border: "1px solid rgba(255,203,5,0.3)",
            borderRadius: "0.4rem", padding: "0.25rem 0.6rem", fontWeight: 600,
          }}>
            ★ Límite de legendario alcanzado
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>Cargando Pokédex...</div>
      ) : (
        <div className="pokedex-grid">
          {filtered.map((p) => {
            const banned = bannedIds.includes(p.pokedexId);
            const selected = selectedIds.includes(p.pokedexId);
            const atMax = !selected && selectedIds.length >= maxSelected;
            // Block non-selected legendaries if limit reached (pick mode only)
            const legendaryBlocked = !banMode && !selected && p.isLegendary && legendaryMaxed;
            const isBlocked = banned || legendaryBlocked;

            let cls = "poke-card";
            if (selected) cls += " selected";
            if (banned) cls += " banned";
            if (p.isLegendary) cls += " legendary";
            if (legendaryBlocked) cls += " legendary-blocked";

            return (
              <motion.div
                key={p.pokedexId}
                whileHover={{ scale: isBlocked || disabled ? 1 : 1.04 }}
                className={cls}
                title={legendaryBlocked ? "Ya tienes un Pokémon legendario en tu equipo" : undefined}
                onClick={() => {
                  if (banned || disabled || legendaryBlocked) return;
                  if (atMax && !banMode) return;
                  onToggle(p.pokedexId);
                }}
              >
                {p.isLegendary && <div className="legendary-badge">★</div>}
                {selected && <div className="selected-check">✓</div>}
                <img src={p.spriteAnimatedFront || p.spriteFront} alt={p.name} loading="lazy" />
                <div className="name">#{p.pokedexId} {p.name}</div>
                <div className="type-row">
                  {p.types.map((t: string) => <TypeBadge key={t} type={t} />)}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
