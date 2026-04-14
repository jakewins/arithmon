import { Monster } from "../model/Monster";
import { TechniqueDef } from "../data/techniques";

export function calculateDamage(
  attacker: Monster,
  technique: TechniqueDef,
  defender: Monster,
): number {
  return Math.floor(
    ((7 + attacker.level) * attacker.attack * technique.power) /
      defender.defense,
  );
}

export function rollAccuracy(accuracy: number): boolean {
  return Math.random() < accuracy;
}

export function rollFleeChance(
  attempts: number,
  userLevel: number,
  targetLevel: number,
): boolean {
  const chance = Math.min(
    0.95,
    0.4 + 0.15 * (attempts + userLevel - targetLevel),
  );
  return Math.random() < chance;
}
