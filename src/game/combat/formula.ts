import { Monster } from "../model/Monster";
import { TechniqueDef } from "../data/techniques";

/** Cumulative XP required to reach a given level. Uses medium-fast cubic curve. */
export function xpForLevel(level: number): number {
  return Math.floor(level * level * level);
}

/** XP awarded for defeating a monster with the given level and base XP yield. */
export function calculateXpReward(defeatedLevel: number, baseXpYield: number): number {
  return Math.floor((baseXpYield * defeatedLevel) / 5);
}

export function calculateDamage(
  attacker: Monster,
  technique: TechniqueDef,
  defender: Monster,
): number {
  return Math.floor(((7 + attacker.level) * attacker.attack * technique.power) / defender.defense);
}

export function rollAccuracy(accuracy: number): boolean {
  return Math.random() < accuracy;
}

export function rollFleeChance(attempts: number, userLevel: number, targetLevel: number): boolean {
  const chance = Math.min(0.95, 0.4 + 0.15 * (attempts + userLevel - targetLevel));
  return Math.random() < chance;
}
