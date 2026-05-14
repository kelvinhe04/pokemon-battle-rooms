import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HpBar } from "./HpBar";
import { TypeBadge } from "./TypeBadge";

interface Props {
  battle: any;
  myPlayerId: string;
  recentEvent?: { kind: string; targetSide: "player" | "opponent" | null } | null;
}

export function BattleScene({ battle, myPlayerId, recentEvent }: Props) {
  const me = battle.players.find((p: any) => p.id === myPlayerId);
  const opp = battle.players.find((p: any) => p.id !== myPlayerId);
  if (!me || !opp) return null;

  const myActive = me.team[me.activeIndex];
  const oppActive = opp.team[opp.activeIndex];

  const [playerAnim, setPlayerAnim] = useState("");
  const [oppAnim, setOppAnim] = useState("");

  useEffect(() => {
    if (!recentEvent) return;
    const { kind, targetSide } = recentEvent;
    if (kind === "attack") {
      // attacker animates forward (we don't always know who, do both subtle for now)
      // detail: if recent log contains attacker on player side, animate player
    }
    if (kind === "damage" && targetSide === "player") {
      setPlayerAnim("flash-red shake");
      setTimeout(() => setPlayerAnim(""), 500);
    } else if (kind === "damage" && targetSide === "opponent") {
      setOppAnim("flash-red shake");
      setTimeout(() => setOppAnim(""), 500);
    }
    if (kind === "faint" && targetSide === "player") {
      setPlayerAnim("faint");
    } else if (kind === "faint" && targetSide === "opponent") {
      setOppAnim("faint");
    }
  }, [recentEvent]);

  return (
    <div className="battle-scene">
      {/* Opponent */}
      <div className="battle-side opponent">
        <div className="battle-info">
          <div className="name-row">
            <span style={{ textTransform: "capitalize" }}>{oppActive.name}</span>
            <span className="level">Lv.{oppActive.level}</span>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            {oppActive.types.map((t: string) => (
              <TypeBadge key={t} type={t} />
            ))}
            {oppActive.status?.kind && (
              <span className={`status-badge ${oppActive.status.kind}`}>{oppActive.status.kind}</span>
            )}
          </div>
          <HpBar current={oppActive.currentHp} max={oppActive.maxHp} />
        </div>
        <AnimatePresence mode="wait">
          <motion.img
            key={oppActive.pokedexId}
            initial={{ opacity: 0, x: 100, scale: 0.5 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.4 }}
            src={oppActive.spriteAnimatedFront || oppActive.spriteFront}
            alt={oppActive.name}
            className={`poke-sprite ${oppAnim}`}
          />
        </AnimatePresence>
      </div>

      {/* Player */}
      <div className="battle-side player">
        <AnimatePresence mode="wait">
          <motion.img
            key={myActive.pokedexId}
            initial={{ opacity: 0, x: -100, scale: 0.5 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.4 }}
            src={myActive.spriteAnimatedBack || myActive.spriteBack || myActive.spriteAnimatedFront}
            alt={myActive.name}
            className={`poke-sprite ${playerAnim}`}
            style={{ transform: "scale(1.4)" }}
          />
        </AnimatePresence>
        <div className="battle-info">
          <div className="name-row">
            <span style={{ textTransform: "capitalize" }}>{myActive.name}</span>
            <span className="level">Lv.{myActive.level}</span>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            {myActive.types.map((t: string) => (
              <TypeBadge key={t} type={t} />
            ))}
            {myActive.status?.kind && (
              <span className={`status-badge ${myActive.status.kind}`}>{myActive.status.kind}</span>
            )}
          </div>
          <HpBar current={myActive.currentHp} max={myActive.maxHp} />
        </div>
      </div>
    </div>
  );
}
