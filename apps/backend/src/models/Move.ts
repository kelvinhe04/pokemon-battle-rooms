import { Schema, model } from "mongoose";

const MoveSchema = new Schema({
  moveId: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  power: { type: Number, default: 0 },
  accuracy: { type: Number, default: 100 },
  priority: { type: Number, default: 0 },
  pp: { type: Number, default: 10 },
  damageClass: { type: String, enum: ["physical", "special", "status"], required: true },
  effect: {
    kind: String, // 'status' | 'stat_change' | null
    chance: Number,
    statusName: String, // 'paralysis' | 'burn' | 'poison'
    stat: String, // 'attack' | 'defense' | 'speed'
    stages: Number, // -1, -2, etc
    target: String, // 'self' | 'opponent'
  },
});

export const Move = model("Move", MoveSchema);
