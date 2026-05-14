import { Schema, model } from "mongoose";

const TypeSchema = new Schema({
  name: { type: String, required: true, unique: true, index: true },
  doubleDamageTo: { type: [String], default: [] },
  halfDamageTo: { type: [String], default: [] },
  noDamageTo: { type: [String], default: [] },
  doubleDamageFrom: { type: [String], default: [] },
  halfDamageFrom: { type: [String], default: [] },
  noDamageFrom: { type: [String], default: [] },
});

export const PType = model("Type", TypeSchema);
