import { PType } from "../models/Type";

// In-memory cache loaded once
let typeChart: Record<string, Record<string, number>> = {};
let loaded = false;

export async function loadTypeChart() {
  const types = await PType.find().lean();
  typeChart = {};
  for (const t of types) {
    const row: Record<string, number> = {};
    for (const def of t.doubleDamageTo) row[def] = 2;
    for (const def of t.halfDamageTo) row[def] = 0.5;
    for (const def of t.noDamageTo) row[def] = 0;
    typeChart[t.name] = row;
  }
  loaded = true;
  console.log(`✓ Loaded type chart for ${types.length} types`);
}

export function getTypeMultiplier(moveType: string, defenderTypes: string[]): number {
  if (!loaded) throw new Error("Type chart not loaded — call loadTypeChart() first");
  let mult = 1;
  const row = typeChart[moveType] || {};
  for (const def of defenderTypes) {
    if (def in row) mult *= row[def];
  }
  return mult;
}

export function isTypeChartLoaded() {
  return loaded;
}
