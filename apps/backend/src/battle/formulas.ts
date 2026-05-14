// Fórmulas exactas del PDF (secciones 5 y 6)
import { randInt, chance } from "../utils/rng";

export const LEVEL = 50;

export interface IVs {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export function randomIVs(): IVs {
  return {
    hp: randInt(0, 31),
    attack: randInt(0, 31),
    defense: randInt(0, 31),
    specialAttack: randInt(0, 31),
    specialDefense: randInt(0, 31),
    speed: randInt(0, 31),
  };
}

// hp = floor(((2*baseHp + ivHp)*level)/100) + level + 10
export function calcHp(baseHp: number, ivHp: number, level = LEVEL): number {
  return Math.floor(((2 * baseHp + ivHp) * level) / 100) + level + 10;
}

// stat = floor(((2*baseStat + ivStat)*level)/100) + 5
export function calcStat(baseStat: number, ivStat: number, level = LEVEL): number {
  return Math.floor(((2 * baseStat + ivStat) * level) / 100) + 5;
}

// Stage multiplier clamp [-6, +6]
export function stageMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

export function effectiveStat(baseBattleStat: number, stage: number): number {
  return Math.floor(baseBattleStat * stageMultiplier(stage));
}

// Precision check
export function hitsTarget(accuracy: number | null | undefined): boolean {
  const acc = accuracy ?? 100;
  return randInt(1, 100) <= acc;
}

// Critical hit (1/24 chance, x1.5)
export function rollCritical(): number {
  return chance(1 / 24) ? 1.5 : 1;
}

// Random factor 0.85 - 1.00
export function randomFactor(): number {
  return randInt(85, 100) / 100;
}

// STAB 1.5 if move type matches one of attacker's types
export function stab(moveType: string, attackerTypes: string[]): number {
  return attackerTypes.includes(moveType) ? 1.5 : 1;
}

// Burn modifier 0.5 for physical moves when attacker burned
export function burnModifier(status: string | undefined, damageClass: string): number {
  if (status === "burn" && damageClass === "physical") return 0.5;
  return 1;
}

export interface DamageInput {
  level: number;
  power: number;
  attackStat: number;
  defenseStat: number;
  movePower: number;
  modifiers: number; // pre-multiplied
}

// PDF formula:
// baseDamage = floor(floor(floor((2*level)/5 + 2) * power * atk / def) / 50) + 2
// final = max(1, floor(baseDamage * modifier))
export function calcBaseDamage(level: number, power: number, atk: number, def: number): number {
  const inner = Math.floor((2 * level) / 5 + 2);
  const step = Math.floor((inner * power * atk) / def);
  return Math.floor(step / 50) + 2;
}

export function calcFinalDamage(baseDamage: number, modifier: number): number {
  return Math.max(1, Math.floor(baseDamage * modifier));
}

// Status passive damage (5% maxHp per turn)
export function passiveStatusDamage(maxHp: number): number {
  return Math.floor(maxHp * 0.05);
}
