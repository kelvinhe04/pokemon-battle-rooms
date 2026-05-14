import { Hono } from "hono";
import { Room } from "../models/Room";
import { Battle } from "../models/Battle";
import { Pokemon } from "../models/Pokemon";
import { Move } from "../models/Move";
import { generateRoomCode } from "../utils/code";
import { broadcast } from "../ws/hub";
import { buildPokemonInstance } from "../battle/engine";
import { randomIVs } from "../battle/formulas";
import { coinFlip } from "../utils/rng";
import { nanoid } from "nanoid";

export const roomsRouter = new Hono();

const TEAM_SIZE = 6;
const BANS_PER_PLAYER = 3;
const TOTAL_BANS = BANS_PER_PLAYER * 2;

// POST /api/rooms  { name }
roomsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const playerName = (body?.name || "Player1").toString().slice(0, 20);
  let code = generateRoomCode();
  // ensure unique
  while (await Room.findOne({ code })) code = generateRoomCode();

  const playerId = nanoid(12);
  const room = await Room.create({
    code,
    status: "waiting",
    players: [{ id: playerId, name: playerName, ready: false }],
  });
  return c.json({ code: room.code, playerId, room });
});

// POST /api/rooms/:code/join { name }
roomsRouter.post("/:code/join", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const body = await c.req.json();
  const playerName = (body?.name || "Player2").toString().slice(0, 20);
  const room = await Room.findOne({ code });
  if (!room) return c.json({ error: "room not found" }, 404);
  if (room.players.length >= 2) return c.json({ error: "room full" }, 409);
  const playerId = nanoid(12);
  room.players.push({ id: playerId, name: playerName, ready: false } as any);
  await room.save();
  broadcast(code, "room:update", room.toJSON());
  return c.json({ code, playerId, room });
});

// GET /api/rooms/:code
roomsRouter.get("/:code", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const room = await Room.findOne({ code }).lean();
  if (!room) return c.json({ error: "not found" }, 404);
  return c.json(room);
});

// POST /api/rooms/:code/ready  { playerId, ready }
roomsRouter.post("/:code/ready", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const { playerId, ready } = await c.req.json();
  const room = await Room.findOne({ code });
  if (!room) return c.json({ error: "not found" }, 404);
  const p = room.players.find((x: any) => x.id === playerId);
  if (!p) return c.json({ error: "player not in room" }, 403);
  p.ready = !!ready;
  // Advance to ban phase when both ready
  if (room.players.length === 2 && room.players.every((x: any) => x.ready) && room.status === "waiting") {
    room.status = "banning";
    room.banTurnPlayerIndex = 0;
    room.banCount = 0;
  }
  await room.save();
  broadcast(code, "room:update", room.toJSON());
  return c.json(room);
});

// POST /api/rooms/:code/ban  { playerId, pokedexId }
roomsRouter.post("/:code/ban", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const { playerId, pokedexId } = await c.req.json();
  const room = await Room.findOne({ code });
  if (!room) return c.json({ error: "not found" }, 404);
  if (room.status !== "banning") return c.json({ error: "not in ban phase" }, 400);
  const playerIndex = room.players.findIndex((x: any) => x.id === playerId);
  if (playerIndex === -1) return c.json({ error: "player not in room" }, 403);
  if (playerIndex !== room.banTurnPlayerIndex) return c.json({ error: "not your turn to ban" }, 403);

  const player: any = room.players[playerIndex];
  if (player.bans.includes(pokedexId)) return c.json({ error: "already banned" }, 400);
  if (player.bans.length >= BANS_PER_PLAYER) return c.json({ error: "out of bans" }, 400);

  player.bans.push(pokedexId);
  room.banCount = (room.banCount || 0) + 1;
  room.banTurnPlayerIndex = room.banTurnPlayerIndex === 0 ? 1 : 0;

  if (room.banCount >= TOTAL_BANS) {
    room.status = "picking";
  }

  await room.save();
  broadcast(code, "room:update", room.toJSON());
  return c.json(room);
});

// POST /api/rooms/:code/team  { playerId, pokedexIds: number[] }
roomsRouter.post("/:code/team", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const { playerId, pokedexIds } = await c.req.json();
  const room = await Room.findOne({ code });
  if (!room) return c.json({ error: "not found" }, 404);
  if (room.status !== "picking") return c.json({ error: "not in picking phase" }, 400);
  const player: any = room.players.find((x: any) => x.id === playerId);
  if (!player) return c.json({ error: "player not in room" }, 403);
  if (!Array.isArray(pokedexIds) || pokedexIds.length === 0 || pokedexIds.length > TEAM_SIZE) {
    return c.json({ error: `team size 1..${TEAM_SIZE}` }, 400);
  }
  // check no banned
  const allBans = room.players.flatMap((x: any) => x.bans);
  if (pokedexIds.some((id: number) => allBans.includes(id))) {
    return c.json({ error: "team includes banned pokemon" }, 400);
  }
  // check max 1 legendary
  const pokes = await Pokemon.find({ pokedexId: { $in: pokedexIds } }).lean();
  const legendCount = pokes.filter((p) => p.isLegendary).length;
  if (legendCount > 1) return c.json({ error: "max 1 legendary per team" }, 400);

  player.teamPokedexIds = pokedexIds;
  await room.save();

  // If both teams set -> coin flip + create battle
  const both = room.players.every((p: any) => p.teamPokedexIds?.length > 0);
  if (both) {
    room.status = "coin_flip";
    await room.save();
    await startBattle(room);
  }

  broadcast(code, "room:update", room.toJSON());
  return c.json(room);
});

async function startBattle(room: any) {
  const battlePlayers: any[] = [];
  for (const player of room.players) {
    const pokes = await Pokemon.find({ pokedexId: { $in: player.teamPokedexIds } }).lean();
    const team: any[] = [];
    for (const id of player.teamPokedexIds) {
      const base = pokes.find((p) => p.pokedexId === id);
      if (!base) continue;
      const moves = await Move.find({ moveId: { $in: base.moveIds } }).lean();
      const ivs = randomIVs();
      const inst = buildPokemonInstance(base, moves, ivs);
      // attach sprites
      (inst as any).spriteFront = base.spriteFront;
      (inst as any).spriteBack = base.spriteBack;
      (inst as any).spriteAnimatedFront = base.spriteAnimatedFront;
      (inst as any).spriteAnimatedBack = base.spriteAnimatedBack;
      (inst as any).ivs = ivs;
      team.push(inst);
    }
    battlePlayers.push({
      id: player.id,
      name: player.name,
      team,
      activeIndex: 0,
    });
  }

  // coin flip for first turn
  const firstTurnPlayerId = battlePlayers[coinFlip()].id;

  const battle = await Battle.create({
    roomCode: room.code,
    turn: 1,
    status: "in_progress",
    players: battlePlayers,
    pendingActions: new Map(),
    battleLog: [
      {
        turn: 1,
        kind: "system",
        text: `¡La batalla comienza! ${battlePlayers.find((p) => p.id === firstTurnPlayerId)!.name} mueve primero.`,
      },
    ],
    firstTurnPlayerId,
  });

  room.battleId = String(battle._id);
  room.status = "in_battle";
  await room.save();

  broadcast(room.code, "battle:start", { battleId: String(battle._id), firstTurnPlayerId });
}
