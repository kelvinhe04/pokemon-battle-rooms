import { Hono } from "hono";
import { Battle } from "../models/Battle";
import { Room } from "../models/Room";
import { resolveTurn, type Action } from "../battle/engine";
import { broadcast } from "../ws/hub";

export const battlesRouter = new Hono();

battlesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const b = await Battle.findById(id).lean();
  if (!b) return c.json({ error: "not found" }, 404);
  return c.json(b);
});

// POST /api/battles/:id/action  { playerId, action: { type:'move'|'switch', moveIndex?, targetIndex? } }
battlesRouter.post("/:id/action", async (c) => {
  const id = c.req.param("id");
  const { playerId, action } = await c.req.json();
  const battle = await Battle.findById(id);
  if (!battle) return c.json({ error: "not found" }, 404);
  if (battle.status !== "in_progress") return c.json({ error: "battle finished" }, 400);

  const player = battle.players.find((p: any) => p.id === playerId);
  if (!player) return c.json({ error: "not in battle" }, 403);

  // ── Forced-switch phase: one player's active just fainted ──
  if ((battle as any).forcedSwitchPlayerId) {
    if ((battle as any).forcedSwitchPlayerId !== playerId) {
      return c.json({ error: "waiting for opponent to switch" }, 400);
    }
    if (action.type !== "switch") {
      return c.json({ error: "active fainted; switch required" }, 400);
    }
    if (
      typeof action.targetIndex !== "number" ||
      action.targetIndex < 0 ||
      action.targetIndex >= player.team.length
    ) {
      return c.json({ error: "invalid switch index" }, 400);
    }
    const tgt = player.team[action.targetIndex];
    if (!tgt || tgt.fainted) return c.json({ error: "target fainted" }, 400);
    if (action.targetIndex === player.activeIndex) return c.json({ error: "already active" }, 400);

    player.activeIndex = action.targetIndex;
    (battle as any).forcedSwitchPlayerId = null;
    battle.turn += 1;
    battle.pendingActions = new Map();
    battle.markModified("players");
    battle.markModified("pendingActions");
    await battle.save();

    broadcast(battle.roomCode, "battle:turn", {
      battleId: String(battle._id),
      battle: (battle as any).toJSON(),
      turnLog: [{ turn: battle.turn, kind: "switch", text: `${player.name} envió a ${tgt.name}!` }],
    });
    return c.json({ ok: true });
  }

  // ── Normal turn ──
  const active = player.team[player.activeIndex];
  if (!active || active.fainted) return c.json({ error: "active fainted; switch required" }, 400);

  if (battle.pendingActions.has(playerId)) {
    return c.json({ error: "already acted this turn" }, 400);
  }

  if (action.type === "move") {
    if (
      typeof action.moveIndex !== "number" ||
      action.moveIndex < 0 ||
      action.moveIndex >= active.moves.length
    ) {
      return c.json({ error: "invalid move index" }, 400);
    }
  } else if (action.type === "switch") {
    if (
      typeof action.targetIndex !== "number" ||
      action.targetIndex < 0 ||
      action.targetIndex >= player.team.length
    ) {
      return c.json({ error: "invalid switch index" }, 400);
    }
    const tgt = player.team[action.targetIndex];
    if (!tgt || tgt.fainted) return c.json({ error: "target fainted" }, 400);
    if (action.targetIndex === player.activeIndex)
      return c.json({ error: "already active" }, 400);
  } else {
    return c.json({ error: "invalid action type" }, 400);
  }

  battle.pendingActions.set(playerId, { ...action, playerId });
  battle.markModified("pendingActions");
  await battle.save();

  broadcast(battle.roomCode, "battle:action_received", { playerId });

  if (battle.pendingActions.size >= 2) {
    await resolveAndEmit(battle);
  }

  return c.json({ ok: true });
});

async function resolveAndEmit(battle: any) {
  const a1 = battle.pendingActions.get(battle.players[0].id) as Action;
  const a2 = battle.pendingActions.get(battle.players[1].id) as Action;

  const playersPair: any = [battle.players[0], battle.players[1]];
  const result = resolveTurn(
    playersPair,
    [a1, a2],
    battle.turn,
    battle.firstTurnPlayerId
  );

  for (const entry of result.log) battle.battleLog.push(entry);
  battle.pendingActions = new Map();
  battle.markModified("pendingActions");
  battle.markModified("players");

  if (result.finished) {
    battle.status = "finished";
    battle.winnerPlayerId = result.winnerPlayerId;
    battle.battleLog.push({
      turn: battle.turn,
      kind: "win",
      text: `¡${battle.players.find((p: any) => p.id === result.winnerPlayerId)?.name} ganó la batalla!`,
    });
    await battle.save();
    broadcast(battle.roomCode, "battle:end", {
      battleId: String(battle._id),
      winnerPlayerId: result.winnerPlayerId,
      battle: battle.toJSON(),
    });

    await Room.updateOne({ code: battle.roomCode }, { $set: { status: "finished" } });
    return;
  }

  // Detect if one player's active fainted but still has alive teammates → forced switch
  const needsSwitch = (p: any) =>
    p.team[p.activeIndex]?.fainted && p.team.some((t: any) => !t.fainted);

  const forcedId =
    needsSwitch(battle.players[0]) ? battle.players[0].id :
    needsSwitch(battle.players[1]) ? battle.players[1].id :
    null;

  (battle as any).forcedSwitchPlayerId = forcedId;

  if (!forcedId) battle.turn += 1;

  await battle.save();
  broadcast(battle.roomCode, "battle:turn", {
    battleId: String(battle._id),
    battle: (battle as any).toJSON(),
    turnLog: result.log,
  });
}
