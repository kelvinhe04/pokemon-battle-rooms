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

  // Validate player belongs
  const player = battle.players.find((p: any) => p.id === playerId);
  if (!player) return c.json({ error: "not in battle" }, 403);

  // Validate active alive
  const active = player.team[player.activeIndex];
  if (!active || active.fainted) return c.json({ error: "active fainted; switch required" }, 400);

  // Anti-double-action
  if (battle.pendingActions.has(playerId)) {
    return c.json({ error: "already acted this turn" }, 400);
  }

  // Validate action shape
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

  // If both submitted -> resolve
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

    // mark room finished
    await Room.updateOne({ code: battle.roomCode }, { $set: { status: "finished" } });
    return;
  }

  battle.turn += 1;
  await battle.save();
  broadcast(battle.roomCode, "battle:turn", {
    battleId: String(battle._id),
    battle: battle.toJSON(),
    turnLog: result.log,
  });
}
