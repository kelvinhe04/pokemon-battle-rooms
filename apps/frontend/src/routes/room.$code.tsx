import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { connectRoomWS } from "../lib/ws";
import { loadSession, saveSession, clearSession } from "../lib/session";
import { PokedexPicker } from "../components/PokedexPicker";
import { BattleScene } from "../components/BattleScene";
import { BattleControls } from "../components/BattleControls";
import { BattleLog } from "../components/BattleLog";
import { CoinFlip } from "../components/CoinFlip";
import { Countdown } from "../components/Countdown";

export const Route = createFileRoute("/room/$code")({
  component: RoomPage,
});

function RoomPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [battle, setBattle] = useState<any>(null);
  const [recentEvent, setRecentEvent] = useState<any>(null);
  const [waitingForOpp, setWaitingForOpp] = useState(false);
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedTeam, setPickedTeam] = useState<number[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const session = typeof window !== "undefined" ? loadSession(code) : null;
  const playerId = session?.playerId;

  useEffect(() => {
    if (!playerId) {
      // No session — needs to join from home
      navigate({ to: "/" });
      return;
    }
    api.getRoom(code).then(setRoom).catch((e) => setError(e.message));
    const ws = connectRoomWS(code, playerId, (event, payload) => {
      if (event === "room:update") setRoom(payload);
      if (event === "battle:start") {
        setShowCoinFlip(true);
        api.battle(payload.battleId).then(setBattle);
        // hide coin flip after 3.5s
        setTimeout(() => setShowCoinFlip(false), 3500);
      }
      if (event === "battle:turn") {
        setBattle(payload.battle);
        setWaitingForOpp(false);
        // Detect notable events for animation
        const log = payload.turnLog || [];
        const lastDamage = log.find((l: any) => l.kind === "damage");
        if (lastDamage) {
          // Heuristic: if log mentions opponent's pokemon name being hit, target is opponent side
          // simpler: just trigger generic shake on whoever has lower HP delta - skip for v1
        }
      }
      if (event === "battle:end") {
        setBattle(payload.battle);
        setWaitingForOpp(false);
      }
    });
    wsRef.current = ws;
    return () => {
      ws.close();
    };
    // eslint-disable-next-line
  }, [code]);

  // Auto-load battle when room enters in_battle on initial mount
  useEffect(() => {
    if (room?.battleId && !battle) {
      api.battle(room.battleId).then(setBattle);
    }
  }, [room?.battleId]);

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <h2>Error</h2>
          <p>{error}</p>
          <button className="btn" onClick={() => navigate({ to: "/" })}>Volver</button>
        </div>
      </div>
    );
  }

  if (!room) {
    return <div className="container"><div className="card">Cargando sala...</div></div>;
  }

  const me = room.players.find((p: any) => p.id === playerId);
  const opp = room.players.find((p: any) => p.id !== playerId);
  if (!me) {
    clearSession(code);
    navigate({ to: "/" });
    return null;
  }

  // ── PHASES ──
  if (room.status === "waiting") {
    return (
      <div className="container">
        <Header code={code} phase="Sala de espera" />
        <div className="card" style={{ marginTop: "2rem", textAlign: "center" }}>
          <h2 style={{ marginBottom: "1rem" }}>Comparte el código con tu rival</h2>
          <div
            style={{
              fontSize: "3rem",
              fontWeight: 800,
              letterSpacing: "0.3em",
              color: "var(--accent)",
              padding: "1rem",
              background: "rgba(0,0,0,0.3)",
              borderRadius: "0.75rem",
              cursor: "pointer",
            }}
            onClick={() => navigator.clipboard?.writeText(code)}
            title="Click para copiar"
          >
            {code}
          </div>
          <p className="muted" style={{ marginTop: "0.75rem" }}>(click para copiar)</p>

          <div style={{ marginTop: "2rem", display: "flex", justifyContent: "space-around", gap: "1rem" }}>
            <PlayerSlot p={me} you />
            <PlayerSlot p={opp} />
          </div>

          {opp ? (
            <button
              className="btn"
              style={{ marginTop: "2rem", padding: "1rem 3rem" }}
              onClick={() => api.ready(code, playerId!, !me.ready).then(setRoom)}
            >
              {me.ready ? "Cancelar" : "¡Listo!"}
            </button>
          ) : (
            <p className="muted" style={{ marginTop: "2rem" }}>Esperando segundo jugador...</p>
          )}
        </div>
      </div>
    );
  }

  if (room.status === "banning") {
    const myIndex = room.players.findIndex((p: any) => p.id === playerId);
    const myTurn = myIndex === room.banTurnPlayerIndex;
    const allBans = room.players.flatMap((p: any) => p.bans || []);
    const myBans = me.bans || [];

    return (
      <div className="container">
        <Header code={code} phase={`Fase de Ban — ${myBans.length}/3`} />
        <div className="card" style={{ marginTop: "1rem" }}>
          <div style={{
            textAlign: "center",
            padding: "1rem 1rem 1.25rem",
            marginBottom: "1rem",
            borderRadius: "0.5rem",
            background: myTurn ? "rgba(255, 200, 0, 0.1)" : "rgba(255,255,255,0.04)",
            border: myTurn ? "1px solid rgba(255, 200, 0, 0.35)" : "1px solid rgba(255,255,255,0.08)",
            position: "relative",
          }}>
            <div style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              color: myTurn ? "var(--yellow, #ffc800)" : "var(--muted, #aaa)",
              letterSpacing: "0.01em",
              marginBottom: "0.25rem",
            }}>
              {myTurn ? "⚔️ ¡Tu turno de banear!" : `⏳ Turno de ${opp?.name}...`}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              Cada jugador banea 3 Pokémon en alternancia
            </p>
            {myTurn && (
              <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
                <Countdown seconds={20} />
              </div>
            )}
          </div>
          <PokedexPicker
            bannedIds={allBans}
            selectedIds={[]}
            disabled={!myTurn}
            banMode
            onToggle={(id) => {
              if (!myTurn) return;
              api.ban(code, playerId!, id).then(setRoom).catch((e) => setError(e.message));
            }}
          />
        </div>
      </div>
    );
  }

  if (room.status === "picking") {
    const allBans = room.players.flatMap((p: any) => p.bans || []);
    const teamSet = me.teamPokedexIds && me.teamPokedexIds.length > 0;
    const confirmed = teamSet;

    return (
      <div className="container">
        <Header code={code} phase={`Selecciona tu equipo — ${pickedTeam.length}/6`} />
        <div className="card" style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", alignItems: "center" }}>
            <div>
              <strong>Elige hasta 6 Pokémon</strong>
              <p className="muted">Máx. 1 legendario (★). Tienes 90 segundos.</p>
            </div>
            {!confirmed && <Countdown seconds={90} onEnd={() => {
              if (pickedTeam.length > 0) handleConfirm();
            }} />}
          </div>

          {confirmed ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <h2>Equipo confirmado ✓</h2>
              <p className="muted">Esperando a {opp?.name}...</p>
            </div>
          ) : (
            <>
              <PokedexPicker
                bannedIds={allBans}
                selectedIds={pickedTeam}
                onToggle={(id) =>
                  setPickedTeam((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 6 ? [...prev, id] : prev
                  )
                }
              />
              <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <button className="btn" disabled={pickedTeam.length === 0} onClick={handleConfirm}>
                  Confirmar equipo ({pickedTeam.length})
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );

    function handleConfirm() {
      api.setTeam(code, playerId!, pickedTeam).then(setRoom).catch((e) => setError(e.message));
    }
  }

  if (room.status === "coin_flip" || showCoinFlip) {
    const winnerName =
      battle && battle.firstTurnPlayerId
        ? battle.players.find((p: any) => p.id === battle.firstTurnPlayerId)?.name
        : "...";
    return (
      <div className="container">
        <Header code={code} phase="Coin Flip" />
        <div className="card"><CoinFlip winnerName={winnerName} /></div>
      </div>
    );
  }

  if (room.status === "in_battle" || room.status === "finished") {
    if (!battle) return <div className="container"><div className="card">Cargando batalla...</div></div>;

    const finished = battle.status === "finished";
    const iWon = finished && battle.winnerPlayerId === playerId;

    return (
      <div className="container">
        <Header code={code} phase={`Turno ${battle.turn}`} />

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
          <div>
            <BattleScene battle={battle} myPlayerId={playerId!} recentEvent={recentEvent} />
            <div style={{ marginTop: "1rem" }}>
              {finished ? (
                <div className="card" style={{ textAlign: "center" }}>
                  <h1 className="title" style={{ fontSize: "3rem" }}>{iWon ? "¡VICTORIA!" : "Derrota"}</h1>
                  <p style={{ marginBottom: "1.5rem" }}>
                    {iWon ? "Has ganado la batalla." : `${battle.players.find((p:any)=>p.id===battle.winnerPlayerId)?.name} ganó.`}
                  </p>
                  <button className="btn" onClick={() => { clearSession(code); navigate({ to: "/" }); }}>
                    Volver al inicio
                  </button>
                </div>
              ) : (
                <BattleControls
                  battle={battle}
                  myPlayerId={playerId!}
                  waiting={waitingForOpp}
                  onMove={(i) => {
                    setWaitingForOpp(true);
                    api.battleAction(String(battle._id), playerId!, { type: "move", moveIndex: i })
                      .catch((e) => { setError(e.message); setWaitingForOpp(false); });
                  }}
                  onSwitch={(i) => {
                    setWaitingForOpp(true);
                    api.battleAction(String(battle._id), playerId!, { type: "switch", targetIndex: i })
                      .catch((e) => { setError(e.message); setWaitingForOpp(false); });
                  }}
                />
              )}
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h3 style={{ marginBottom: "0.75rem" }}>Tu equipo</h3>
              <TeamMini player={battle.players.find((p:any)=>p.id===playerId)} />
            </div>
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h3 style={{ marginBottom: "0.75rem" }}>Equipo rival</h3>
              <TeamMini player={battle.players.find((p:any)=>p.id!==playerId)} hideHpNumbers />
            </div>
            <div className="card">
              <h3 style={{ marginBottom: "0.75rem" }}>Log</h3>
              <BattleLog entries={battle.battleLog || []} />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                bottom: 24,
                right: 24,
                background: "var(--red)",
                color: "white",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
              onClick={() => setError(null)}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return <div className="container"><div className="card">Estado desconocido: {room.status}</div></div>;
}

function Header({ code, phase }: { code: string; phase: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h1 className="title" style={{ fontSize: "1.75rem" }}>Sala {code}</h1>
      <span className="muted" style={{ fontSize: "1rem" }}>{phase}</span>
    </div>
  );
}

function PlayerSlot({ p, you }: { p: any; you?: boolean }) {
  return (
    <div className="card" style={{ flex: 1, textAlign: "center", background: p?.ready ? "rgba(92,219,92,0.15)" : undefined }}>
      <div style={{ fontWeight: 700, fontSize: "1.25rem" }}>{p?.name || "—"}</div>
      <div className="muted">{you ? "(tú)" : ""}</div>
      <div style={{ marginTop: "0.5rem", color: p?.ready ? "var(--green)" : "var(--muted)" }}>
        {p ? (p.ready ? "✓ Listo" : "Esperando...") : "Sin jugador"}
      </div>
    </div>
  );
}

function TeamMini({ player, hideHpNumbers }: { player: any; hideHpNumbers?: boolean }) {
  if (!player) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
      {player.team.map((p: any, i: number) => (
        <div
          key={i}
          style={{
            textAlign: "center",
            padding: "0.4rem",
            borderRadius: "0.5rem",
            background: i === player.activeIndex ? "rgba(255,203,5,0.15)" : "rgba(0,0,0,0.2)",
            opacity: p.fainted ? 0.4 : 1,
            border: i === player.activeIndex ? "1px solid var(--accent)" : "1px solid transparent",
          }}
        >
          <img
            src={p.spriteFront}
            alt={p.name}
            style={{ width: 48, height: 48, imageRendering: "pixelated" as any }}
          />
          <div style={{ fontSize: "0.7rem", textTransform: "capitalize" }}>{p.name}</div>
          {!hideHpNumbers && (
            <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
              {p.currentHp}/{p.maxHp}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
