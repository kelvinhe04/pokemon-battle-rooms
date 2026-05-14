import { Schema, model } from "mongoose";

const PokemonSchema = new Schema({
  pokedexId: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  types: { type: [String], required: true },
  baseStats: {
    hp: Number,
    attack: Number,
    defense: Number,
    specialAttack: Number,
    specialDefense: Number,
    speed: Number,
  },
  spriteFront: String,
  spriteBack: String,
  spriteAnimatedFront: String,
  spriteAnimatedBack: String,
  moveIds: { type: [Number], default: [] },
  isLegendary: { type: Boolean, default: false },
  evolutionChainId: Number,
  generation: Number,
});

export const Pokemon = model("Pokemon", PokemonSchema);
export type PokemonDoc = InstanceType<typeof Pokemon>;
