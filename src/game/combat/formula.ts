import { Monster } from "../model/Monster";
import { TechniqueDef } from "../data/techniques";
import { MONSTERS } from "../data/monsters";
import { effectivenessMultiplier } from "./elements";

/** Cumulative XP required to reach a given level. Uses medium-fast cubic curve. */
export function xpForLevel(level: number): number {
  return Math.floor(level * level * level);
}

/** XP awarded for defeating a monster with the given level and base XP yield. */
export function calculateXpReward(defeatedLevel: number, baseXpYield: number): number {
  return Math.floor((baseXpYield * defeatedLevel) / 5);
}

export interface DamageResult {
  damage: number;
  effectiveness: number;
}

export function calculateDamage(
  attacker: Monster,
  technique: TechniqueDef,
  defender: Monster,
): DamageResult {
  const defenderDef = MONSTERS[defender.slug];
  const effectiveness = effectivenessMultiplier(technique.element, defenderDef.types);
  const offenseStat = technique.range === "melee" ? attacker.melee : attacker.ranged;
  const defenseStat = technique.range === "melee" ? defender.armor : defender.dodge;
  const base = ((7 + attacker.level) * offenseStat * technique.power) / defenseStat;
  return {
    damage: Math.floor(base * effectiveness),
    effectiveness,
  };
}

export function rollAccuracy(accuracy: number): boolean {
  return Math.random() < accuracy;
}

export function rollFleeChance(attempts: number, userLevel: number, targetLevel: number): boolean {
  const chance = Math.min(0.95, 0.4 + 0.15 * (attempts + userLevel - targetLevel));
  return Math.random() < chance;
}

const SHAKE_DIVISOR = 256;

/**
 * Compute the shake check value for a capture attempt.
 * Based on Tuxemon's Gen III-IV formula:
 *   (3*maxHP - 2*currentHP) * catchRate * ballModifier / (3*maxHP)
 * Lower HP = higher value = easier to catch.
 */
export function shakeCheck(target: Monster, ballModifier: number): number {
  const def = MONSTERS[target.slug];
  const catchRate = def.catchRate;
  return Math.floor(
    ((3 * target.maxHp - 2 * target.currentHp) * catchRate * ballModifier) / (3 * target.maxHp),
  );
}

/**
 * Simulate a capture attempt with the given shake check value.
 * Each of `totalShakes` iterations rolls random(0, SHAKE_DIVISOR).
 * If the roll exceeds shakeValue, the monster escapes at that shake.
 * All shakes passing = captured.
 */
export function attemptCapture(
  shakeValue: number,
  totalShakes = 4,
): { success: boolean; shakes: number } {
  for (let i = 0; i < totalShakes; i++) {
    const roll = Math.floor(Math.random() * SHAKE_DIVISOR);
    if (roll > shakeValue) {
      return { success: false, shakes: i + 1 };
    }
  }
  return { success: true, shakes: totalShakes };
}
