// Importa data de PokéAPI a MongoDB.
// - 300+ Pokémon
// - Todos los tipos con relaciones de daño
// - Movimientos referenciados
// - Marca legendarios y evolutionChainId
// - Excluye Pokémon con <4 movimientos válidos

import { connectDb } from "../db";
import { Pokemon } from "../models/Pokemon";
import { Move } from "../models/Move";
import { PType } from "../models/Type";

const API = "https://pokeapi.co/api/v2";
const TARGET_COUNT = 300;
const FETCH_LIMIT = 500; // buscamos extra por si excluimos algunos
const CONCURRENCY = 8;

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return res.json();
}

async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      try {
        out[i] = await fn(items[i], i);
      } catch (e) {
        console.warn(`  ! item ${i} failed:`, (e as Error).message);
        out[i] = null as any;
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

const TYPE_NAMES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark",
  "steel", "fairy",
];

async function seedTypes() {
  console.log("⇨ Seeding types...");
  const existing = await PType.countDocuments();
  if (existing >= TYPE_NAMES.length) {
    console.log("  Types already seeded.");
    return;
  }

  for (const name of TYPE_NAMES) {
    const data = await fetchJson(`${API}/type/${name}/`);
    const dr = data.damage_relations;
    await PType.updateOne(
      { name },
      {
        $set: {
          name,
          doubleDamageTo: dr.double_damage_to.map((t: any) => t.name),
          halfDamageTo: dr.half_damage_to.map((t: any) => t.name),
          noDamageTo: dr.no_damage_to.map((t: any) => t.name),
          doubleDamageFrom: dr.double_damage_from.map((t: any) => t.name),
          halfDamageFrom: dr.half_damage_from.map((t: any) => t.name),
          noDamageFrom: dr.no_damage_from.map((t: any) => t.name),
        },
      },
      { upsert: true }
    );
  }
  console.log(`✓ Seeded ${TYPE_NAMES.length} types`);
}

function mapDamageClass(s: string): "physical" | "special" | "status" {
  if (s === "physical" || s === "special" || s === "status") return s;
  return "status";
}

function parseEffect(moveData: any): any | null {
  // Try to derive a simple effect for status moves
  const meta = moveData.meta;
  if (!meta) return null;
  const ailment = meta.ailment?.name;
  if (ailment && ailment !== "none" && ailment !== "unknown") {
    const map: Record<string, string> = {
      paralysis: "paralysis",
      burn: "burn",
      poison: "poison",
      "bad-poison": "poison",
      freeze: "freeze",
      sleep: "sleep",
    };
    if (map[ailment]) {
      return {
        kind: "status",
        chance: meta.ailment_chance || (moveData.damage_class?.name === "status" ? 100 : 30),
        statusName: map[ailment],
        target: "opponent",
      };
    }
  }
  // Stat changes
  if (moveData.stat_changes && moveData.stat_changes.length > 0) {
    const sc = moveData.stat_changes[0];
    const statMap: Record<string, string> = {
      attack: "attack",
      defense: "defense",
      "special-attack": "specialAttack",
      "special-defense": "specialDefense",
      speed: "speed",
    };
    const stat = statMap[sc.stat.name];
    if (stat) {
      return {
        kind: "stat_change",
        chance: meta.stat_chance || 100,
        stat,
        stages: sc.change,
        target: sc.change > 0 ? "self" : "opponent",
      };
    }
  }
  return null;
}

async function seedMoves(moveUrls: Set<string>) {
  console.log(`⇨ Seeding ${moveUrls.size} unique moves...`);
  const urls = Array.from(moveUrls);
  let imported = 0;

  await withConcurrency(urls, CONCURRENCY, async (url) => {
    const m = await fetchJson(url);
    await Move.updateOne(
      { moveId: m.id },
      {
        $set: {
          moveId: m.id,
          name: m.name,
          type: m.type.name,
          power: m.power ?? 0,
          accuracy: m.accuracy ?? 100,
          priority: m.priority ?? 0,
          pp: m.pp ?? 10,
          damageClass: mapDamageClass(m.damage_class?.name),
          effect: parseEffect(m),
        },
      },
      { upsert: true }
    );
    imported++;
    if (imported % 50 === 0) console.log(`  moves imported: ${imported}/${urls.length}`);
  });
  console.log(`✓ Seeded ${imported} moves`);
}

async function seedPokemon() {
  console.log(`⇨ Fetching Pokémon list (limit=${FETCH_LIMIT})...`);
  const list = await fetchJson(`${API}/pokemon?limit=${FETCH_LIMIT}&offset=0`);
  const refs: Array<{ name: string; url: string }> = list.results;

  console.log(`⇨ Fetching ${refs.length} Pokémon details...`);
  const moveUrls = new Set<string>();
  const docs: any[] = [];
  const excluded: string[] = [];

  await withConcurrency(refs, CONCURRENCY, async (ref) => {
    const p = await fetchJson(ref.url);

    // Collect damaging/usable moves
    const moves = p.moves.map((m: any) => m.move);
    if (moves.length < 4) {
      excluded.push(`${ref.name} (<4 moves)`);
      return;
    }

    // Get species info for legendary + evolution chain
    let species: any = null;
    let evolutionChainId: number | undefined;
    let isLegendary = false;
    try {
      species = await fetchJson(p.species.url);
      isLegendary = species.is_legendary || species.is_mythical || false;
      if (species.evolution_chain?.url) {
        const m = species.evolution_chain.url.match(/evolution-chain\/(\d+)/);
        if (m) evolutionChainId = parseInt(m[1]);
      }
    } catch (_) {
      // best effort
    }

    const stats: Record<string, number> = {};
    for (const s of p.stats) stats[s.stat.name] = s.base_stat;

    const sprites = p.sprites;
    const animated = sprites?.versions?.["generation-v"]?.["black-white"]?.animated;

    docs.push({
      pokedexId: p.id,
      name: p.name,
      types: p.types.map((t: any) => t.type.name),
      baseStats: {
        hp: stats["hp"],
        attack: stats["attack"],
        defense: stats["defense"],
        specialAttack: stats["special-attack"],
        specialDefense: stats["special-defense"],
        speed: stats["speed"],
      },
      spriteFront: sprites?.front_default || "",
      spriteBack: sprites?.back_default || "",
      spriteAnimatedFront: animated?.front_default || sprites?.front_default || "",
      spriteAnimatedBack: animated?.back_default || sprites?.back_default || "",
      moveUrls: moves.map((m: any) => m.url),
      isLegendary,
      evolutionChainId,
      generation: 0, // could derive from species.generation but optional
    });

    for (const m of moves) moveUrls.add(m.url);
  });

  console.log(`  Fetched ${docs.length} valid pokémon, ${excluded.length} excluded`);
  if (excluded.length) console.log("  Excluded:", excluded.slice(0, 10).join(", "));

  // Seed moves first so we can map ids
  await seedMoves(moveUrls);
  const allMoves = await Move.find({}, { moveId: 1, power: 1, accuracy: 1 }).lean();
  const moveByUrl = new Map<string, number>();
  // Use moveId from the url numerator
  for (const ref of moveUrls) {
    const m = ref.match(/move\/(\d+)/);
    if (m) moveByUrl.set(ref, parseInt(m[1]));
  }
  const moveMap = new Map<number, any>();
  for (const m of allMoves) moveMap.set(m.moveId, m);

  console.log("⇨ Auto-assigning top-4 moves per pokémon by power...");
  let kept = 0;
  for (const d of docs) {
    const moveIds: number[] = [];
    for (const url of d.moveUrls) {
      const id = moveByUrl.get(url);
      if (id) moveIds.push(id);
    }
    // sort by power desc, accuracy desc
    moveIds.sort((a, b) => {
      const ma = moveMap.get(a) || { power: 0, accuracy: 0 };
      const mb = moveMap.get(b) || { power: 0, accuracy: 0 };
      if (mb.power !== ma.power) return (mb.power || 0) - (ma.power || 0);
      return (mb.accuracy || 0) - (ma.accuracy || 0);
    });
    const uniq = Array.from(new Set(moveIds));
    if (uniq.length < 4) {
      excluded.push(`${d.name} (<4 unique moves after dedup)`);
      continue;
    }
    d.moveIds = uniq.slice(0, 4);
    delete d.moveUrls;
    kept++;
    if (kept >= TARGET_COUNT) break;
  }

  const finalDocs = docs.filter((d) => d.moveIds && d.moveIds.length === 4).slice(0, TARGET_COUNT);

  console.log(`⇨ Upserting ${finalDocs.length} Pokémon...`);
  for (const d of finalDocs) {
    await Pokemon.updateOne({ pokedexId: d.pokedexId }, { $set: d }, { upsert: true });
  }
  console.log(`✓ Seeded ${finalDocs.length} pokémon (target ${TARGET_COUNT})`);
}

async function main() {
  await connectDb();

  const pokemonCount = await Pokemon.countDocuments();
  if (pokemonCount >= TARGET_COUNT) {
    console.log(`✓ DB already has ${pokemonCount} pokemon. Skipping seed.`);
    console.log("   To re-seed, drop the 'pokemons' collection first.");
    process.exit(0);
  }

  await seedTypes();
  await seedPokemon();

  console.log("✓ Seed complete");
  process.exit(0);
}

main().catch((e) => {
  console.error("✗ Seed failed:", e);
  process.exit(1);
});
