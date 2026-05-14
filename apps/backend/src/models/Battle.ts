import { Schema, model } from "mongoose";

const PokemonInstanceSchema = new Schema(
  {
    pokedexId: Number,
    name: String,
    types: [String],
    level: { type: Number, default: 50 },
    ivs: {
      hp: Number,
      attack: Number,
      defense: Number,
      specialAttack: Number,
      specialDefense: Number,
      speed: Number,
    },
    maxHp: Number,
    currentHp: Number,
    battleStats: {
      attack: Number,
      defense: Number,
      specialAttack: Number,
      specialDefense: Number,
      speed: Number,
    },
    statStages: {
      attack: { type: Number, default: 0 },
      defense: { type: Number, default: 0 },
      specialAttack: { type: Number, default: 0 },
      specialDefense: { type: Number, default: 0 },
      speed: { type: Number, default: 0 },
    },
    moves: [
      {
        moveId: Number,
        name: String,
        type: String,
        power: Number,
        accuracy: Number,
        priority: Number,
        damageClass: String,
        pp: Number,
        effect: Schema.Types.Mixed,
      },
    ],
    status: {
      kind: String, // 'paralysis' | 'burn' | 'poison' | etc
      remainingTurns: Number,
    },
    spriteFront: String,
    spriteBack: String,
    spriteAnimatedFront: String,
    spriteAnimatedBack: String,
    fainted: { type: Boolean, default: false },
  },
  { _id: false }
);

const BattlePlayerSchema = new Schema(
  {
    id: String,
    name: String,
    team: [PokemonInstanceSchema],
    activeIndex: { type: Number, default: 0 },
  },
  { _id: false }
);

const LogEntrySchema = new Schema(
  {
    turn: Number,
    text: String,
    kind: String, // 'attack' | 'damage' | 'switch' | 'status' | 'super' | 'crit' | 'miss' | 'faint' | 'win' | 'system'
  },
  { _id: false }
);

const BattleSchema = new Schema({
  roomCode: { type: String, required: true, index: true },
  turn: { type: Number, default: 1 },
  status: { type: String, enum: ["in_progress", "finished"], default: "in_progress" },
  players: { type: [BattlePlayerSchema], default: [] },
  pendingActions: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map(),
  },
  battleLog: { type: [LogEntrySchema], default: [] },
  winnerPlayerId: { type: String, default: null },
  firstTurnPlayerId: { type: String, default: null }, // result of coin flip
  createdAt: { type: Date, default: Date.now },
});

export const Battle = model("Battle", BattleSchema);
