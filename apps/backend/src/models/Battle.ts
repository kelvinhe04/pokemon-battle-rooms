import { Schema, model } from "mongoose";

const MoveEffectSchema = new Schema(
  {
    kind: String,
    chance: Number,
    statusName: String,
    stat: String,
    stages: Number,
    target: String,
  },
  { _id: false }
);

const MoveInstanceSchema = new Schema(
  {
    moveId: Number,
    name: String,
    type: String,
    power: Number,
    accuracy: Number,
    priority: Number,
    damageClass: String,
    pp: Number,
    effect: MoveEffectSchema,
  },
  { _id: false }
);

const IvsSchema = new Schema(
  { hp: Number, attack: Number, defense: Number, specialAttack: Number, specialDefense: Number, speed: Number },
  { _id: false }
);

const StatsSchema = new Schema(
  { attack: Number, defense: Number, specialAttack: Number, specialDefense: Number, speed: Number },
  { _id: false }
);

const StatStagesSchema = new Schema(
  {
    attack: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    specialAttack: { type: Number, default: 0 },
    specialDefense: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
  },
  { _id: false }
);

const StatusSchema = new Schema(
  { kind: String, remainingTurns: Number },
  { _id: false }
);

const PokemonInstanceSchema = new Schema(
  {
    pokedexId: Number,
    name: String,
    types: [String],
    level: { type: Number, default: 50 },
    ivs: IvsSchema,
    maxHp: Number,
    currentHp: Number,
    battleStats: StatsSchema,
    statStages: StatStagesSchema,
    moves: { type: [MoveInstanceSchema], default: [] },
    status: StatusSchema,
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
  firstTurnPlayerId: { type: String, default: null },
  forcedSwitchPlayerId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

export const Battle = model("Battle", BattleSchema);
