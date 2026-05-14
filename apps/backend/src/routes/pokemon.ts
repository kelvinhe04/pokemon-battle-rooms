import { Hono } from "hono";
import { Pokemon } from "../models/Pokemon";
import { Move } from "../models/Move";

export const pokemonRouter = new Hono();

pokemonRouter.get("/", async (c) => {
  const q = c.req.query("q") || "";
  const type = c.req.query("type") || "";
  const limit = Math.min(parseInt(c.req.query("limit") || "300"), 600);
  const filter: any = {};
  if (q) filter.name = { $regex: q.toLowerCase(), $options: "i" };
  if (type) filter.types = type;
  const docs = await Pokemon.find(filter).limit(limit).lean();
  return c.json(docs);
});

pokemonRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const p = await Pokemon.findOne({ pokedexId: id }).lean();
  if (!p) return c.json({ error: "not found" }, 404);
  const moves = await Move.find({ moveId: { $in: p.moveIds } }).lean();
  return c.json({ ...p, moves });
});

pokemonRouter.get("/types/all", async (c) => {
  const types = await Pokemon.distinct("types");
  return c.json(types.sort());
});
