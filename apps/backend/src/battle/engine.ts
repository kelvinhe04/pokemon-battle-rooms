// Motor de batalla — resuelve turnos, calcula daño, aplica estados.
// 100% en servidor según PDF.

import {
  calcBaseDamage,
  calcFinalDamage,
  calcHp,
  calcStat,
  effectiveStat,
  hitsTarget,
  passiveStatusDamage,
  randomFactor,
  rollCritical,
  stab,
  burnModifier,
} from "./formulas";
import { getTypeMultiplier } from "./types";
import { coinFlip, randInt } from "../utils/rng";

export interface PokeInst {
  pokedexId: number;
  name: string;
  types: string[];
  level: number;
  maxHp: number;
  currentHp: number;
  battleStats: {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  statStages: {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  moves: Array<{
    moveId: number;
    name: string;
    type: string;
    power: number;
    accuracy: number;
    priority: number;
    damageClass: "physical" | "special" | "status";
    pp: number;
    effect?: any;
  }>;
  status?: { kind: string; remainingTurns: number };
  fainted: boolean;
}

export interface BattlePlayer {
  id: string;
  name: string;
  team: PokeInst[];
  activeIndex: number;
}

export type Action =
  | { type: "move"; playerId: string; moveIndex: number }
  | { type: "switch"; playerId: string; targetIndex: number };

export interface LogEntry {
  turn: number;
  text: string;
  kind: string;
}

export interface ResolveResult {
  log: LogEntry[];
  finished: boolean;
  winnerPlayerId?: string;
}

// Choose attack/defense stat based on move category
function chooseStats(attacker: PokeInst, defender: PokeInst, damageClass: string) {
  if (damageClass === "physical") {
    return {
      atk: effectiveStat(attacker.battleStats.attack, attacker.statStages.attack),
      def: effectiveStat(defender.battleStats.defense, defender.statStages.defense),
    };
  }
  // special
  return {
    atk: effectiveStat(attacker.battleStats.specialAttack, attacker.statStages.specialAttack),
    def: effectiveStat(defender.battleStats.specialDefense, defender.statStages.specialDefense),
  };
}

// Paralysis halves speed (PDF optional)
function getSpeed(p: PokeInst): number {
  let spe = effectiveStat(p.battleStats.speed, p.statStages.speed);
  if (p.status?.kind === "paralysis") spe = Math.floor(spe / 2);
  return spe;
}

// Action priority — PDF section 5
function actionPriority(action: Action, attacker: PokeInst): number {
  if (action.type === "switch") return 6;
  const move = attacker.moves[action.moveIndex];
  return move?.priority ?? 0;
}

// Determine order of resolution
function resolveOrder(
  actionA: Action,
  actionB: Action,
  attA: PokeInst,
  attB: PokeInst,
  firstTurn: boolean,
  firstTurnPlayerId: string | null
): [Action, Action] {
  // First turn forced by coin flip
  if (firstTurn && firstTurnPlayerId) {
    const aFirst = actionA.playerId === firstTurnPlayerId;
    return aFirst ? [actionA, actionB] : [actionB, actionA];
  }
  const pA = actionPriority(actionA, attA);
  const pB = actionPriority(actionB, attB);
  if (pA !== pB) return pA > pB ? [actionA, actionB] : [actionB, actionA];
  const sA = getSpeed(attA);
  const sB = getSpeed(attB);
  if (sA !== sB) return sA > sB ? [actionA, actionB] : [actionB, actionA];
  // tie -> coin flip
  return coinFlip() === 0 ? [actionA, actionB] : [actionB, actionA];
}

function applyEffect(target: PokeInst, attacker: PokeInst, move: any, log: LogEntry[], turn: number) {
  if (!move.effect) return;
  const eff = move.effect;
  const triggers = eff.chance == null ? true : randInt(1, 100) <= eff.chance;
  if (!triggers) return;

  // Status effects (paralysis/burn/poison)
  if (eff.kind === "status" && eff.statusName) {
    const recipient = eff.target === "self" ? attacker : target;
    if (!recipient.status) {
      recipient.status = { kind: eff.statusName, remainingTurns: 3 };
      log.push({
        turn,
        kind: "status",
        text: `${recipient.name} fue afectado por ${eff.statusName}.`,
      });
    }
  }

  // Stat changes
  if (eff.kind === "stat_change" && eff.stat && typeof eff.stages === "number") {
    const recipient = eff.target === "self" ? attacker : target;
    const stat = eff.stat as keyof typeof recipient.statStages;
    if (recipient.statStages[stat] !== undefined) {
      recipient.statStages[stat] = Math.max(-6, Math.min(6, recipient.statStages[stat] + eff.stages));
      const dir = eff.stages > 0 ? "subió" : "bajó";
      log.push({
        turn,
        kind: "status",
        text: `${recipient.name}: ${stat} ${dir}.`,
      });
    }
  }
}

function executeMove(
  attacker: PokeInst,
  defender: PokeInst,
  moveIndex: number,
  log: LogEntry[],
  turn: number
) {
  const move = attacker.moves[moveIndex];
  if (!move) return;

  log.push({
    turn,
    kind: "attack",
    text: `${attacker.name} usó ${move.name}!`,
  });

  // accuracy
  if (!hitsTarget(move.accuracy)) {
    log.push({ turn, kind: "miss", text: "¡Falló!" });
    return;
  }

  // damage
  if (move.damageClass !== "status" && move.power > 0) {
    const { atk, def } = chooseStats(attacker, defender, move.damageClass);
    const typeMult = getTypeMultiplier(move.type, defender.types);

    if (typeMult === 0) {
      log.push({ turn, kind: "super", text: "No tuvo efecto..." });
      return;
    }

    const crit = rollCritical();
    const rand = randomFactor();
    const stabMod = stab(move.type, attacker.types);
    const burn = burnModifier(attacker.status?.kind, move.damageClass);

    const base = calcBaseDamage(attacker.level, move.power, atk, def);
    const modifier = rand * stabMod * typeMult * crit * burn;
    const dmg = calcFinalDamage(base, modifier);

    defender.currentHp = Math.max(0, defender.currentHp - dmg);

    log.push({
      turn,
      kind: "damage",
      text: `${defender.name} perdió ${dmg} PS.`,
    });

    if (crit > 1) log.push({ turn, kind: "crit", text: "¡Un golpe crítico!" });
    if (typeMult > 1) log.push({ turn, kind: "super", text: "¡Es súper efectivo!" });
    else if (typeMult < 1) log.push({ turn, kind: "super", text: "No es muy efectivo..." });

    if (defender.currentHp === 0) {
      defender.fainted = true;
      log.push({ turn, kind: "faint", text: `${defender.name} se debilitó!` });
      return;
    }
  }

  // apply effect (status, stat change)
  applyEffect(defender, attacker, move, log, turn);
}

function executeSwitch(player: BattlePlayer, targetIndex: number, log: LogEntry[], turn: number) {
  const current = player.team[player.activeIndex];
  const next = player.team[targetIndex];
  if (!next || next.fainted || targetIndex === player.activeIndex) return;

  // Clear temporary stat stages and status when switching out (PDF rule)
  if (current) {
    current.statStages = {
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
    };
    current.status = undefined;
  }

  player.activeIndex = targetIndex;
  log.push({
    turn,
    kind: "switch",
    text: `${player.name} sacó a ${current?.name} y envió a ${next.name}!`,
  });
}

function tickStatusAtTurnEnd(p: PokeInst, log: LogEntry[], turn: number) {
  if (!p.status || p.fainted) return;
  const s = p.status;

  // passive damage
  if (s.kind === "burn") {
    const dmg = passiveStatusDamage(p.maxHp);
    p.currentHp = Math.max(0, p.currentHp - dmg);
    log.push({ turn, kind: "status", text: `${p.name} sufrió daño por quemadura (${dmg} PS).` });
  } else if (s.kind === "poison") {
    const dmg = passiveStatusDamage(p.maxHp);
    p.currentHp = Math.max(0, p.currentHp - dmg);
    log.push({ turn, kind: "status", text: `${p.name} sufrió daño por veneno (${dmg} PS).` });
  }

  if (p.currentHp === 0) {
    p.fainted = true;
    log.push({ turn, kind: "faint", text: `${p.name} se debilitó!` });
    return;
  }

  // tick down
  s.remainingTurns -= 1;
  if (s.remainingTurns <= 0) {
    log.push({ turn, kind: "status", text: `${p.name} se recuperó de ${s.kind}.` });
    p.status = undefined;
  }
}

function teamWiped(player: BattlePlayer): boolean {
  return player.team.every((p) => p.fainted);
}

export function resolveTurn(
  players: [BattlePlayer, BattlePlayer],
  actions: [Action, Action],
  turn: number,
  firstTurnPlayerId: string | null
): ResolveResult {
  const log: LogEntry[] = [];

  // Map actions to player objects
  const [pA, pB] = players;
  const aActor = actions.find((a) => a.playerId === pA.id)!;
  const bActor = actions.find((a) => a.playerId === pB.id)!;

  const attA = pA.team[pA.activeIndex];
  const attB = pB.team[pB.activeIndex];

  const [first, second] = resolveOrder(
    aActor,
    bActor,
    attA,
    attB,
    turn === 1,
    firstTurnPlayerId
  );

  const exec = (act: Action) => {
    const isA = act.playerId === pA.id;
    const me = isA ? pA : pB;
    const opp = isA ? pB : pA;

    if (act.type === "switch") {
      executeSwitch(me, act.targetIndex, log, turn);
    } else {
      const meActive = me.team[me.activeIndex];
      const oppActive = opp.team[opp.activeIndex];
      if (!meActive || meActive.fainted) return;
      executeMove(meActive, oppActive, act.moveIndex, log, turn);
    }
  };

  exec(first);
  // check victory mid-turn
  if (teamWiped(pA))
    return { log, finished: true, winnerPlayerId: pB.id };
  if (teamWiped(pB))
    return { log, finished: true, winnerPlayerId: pA.id };

  // second only if its active is not fainted
  const secondActor = second.playerId === pA.id ? pA : pB;
  const secondActive = secondActor.team[secondActor.activeIndex];
  if (secondActive && !secondActive.fainted) exec(second);

  // end-of-turn: tick status on both active mons
  tickStatusAtTurnEnd(pA.team[pA.activeIndex], log, turn);
  if (!teamWiped(pA)) tickStatusAtTurnEnd(pB.team[pB.activeIndex], log, turn);

  if (teamWiped(pA))
    return { log, finished: true, winnerPlayerId: pB.id };
  if (teamWiped(pB))
    return { log, finished: true, winnerPlayerId: pA.id };

  return { log, finished: false };
}

// Initialize a battle pokemon instance from base pokemon data + 4 chosen moves
export function buildPokemonInstance(base: any, moves: any[], ivs: any): PokeInst {
  const maxHp = calcHp(base.baseStats.hp, ivs.hp);
  return {
    pokedexId: base.pokedexId,
    name: base.name,
    types: base.types,
    level: 50,
    maxHp,
    currentHp: maxHp,
    battleStats: {
      attack: calcStat(base.baseStats.attack, ivs.attack),
      defense: calcStat(base.baseStats.defense, ivs.defense),
      specialAttack: calcStat(base.baseStats.specialAttack, ivs.specialAttack),
      specialDefense: calcStat(base.baseStats.specialDefense, ivs.specialDefense),
      speed: calcStat(base.baseStats.speed, ivs.speed),
    },
    statStages: {
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
    },
    moves: moves.slice(0, 4).map((m) => ({
      moveId: m.moveId,
      name: m.name,
      type: m.type,
      power: m.power || 0,
      accuracy: m.accuracy ?? 100,
      priority: m.priority || 0,
      damageClass: m.damageClass,
      pp: m.pp || 10,
      effect: m.effect,
    })),
    fainted: false,
  };
}
