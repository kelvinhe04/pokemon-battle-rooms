import { Schema, model } from "mongoose";

const PlayerSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    ready: { type: Boolean, default: false },
    bans: { type: [Number], default: [] },
    teamPokedexIds: { type: [Number], default: [] }, // selected for battle
  },
  { _id: false }
);

const RoomSchema = new Schema({
  code: { type: String, required: true, unique: true, index: true },
  status: {
    type: String,
    enum: ["waiting", "banning", "picking", "coin_flip", "in_battle", "finished"],
    default: "waiting",
  },
  players: { type: [PlayerSchema], default: [] },
  banTurnPlayerIndex: { type: Number, default: 0 }, // for alternating ban
  banCount: { type: Number, default: 0 }, // total bans done
  battleId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 1000 * 60 * 60) },
});

export const Room = model("Room", RoomSchema);
