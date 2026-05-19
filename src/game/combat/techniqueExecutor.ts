import type { Monster } from "../model/Monster";
import type { TechniqueDef, TechniqueEffect } from "../data/techniques";
import { calculateDamage, rollAccuracy } from "./formula";
import { applyStatus } from "./statusHandler";
import { adjustStage } from "./statStages";

export interface ExecutorEvent {
  type:
    | "attack_use"
    | "miss"
    | "damage"
    | "effectiveness"
    | "status_apply"
    | "status_resist"
    | "heal"
    | "stat_stage";
  message: string;
  /** Damage amount for `damage`, heal amount for `heal`. */
  amount?: number;
  /** Effectiveness multiplier for `effectiveness`. */
  effectiveness?: number;
}

/**
 * Force status-apply rolls to succeed regardless of `chance`. Used by QA
 * puppeteer scripts to deterministically demonstrate status mechanics.
 */
export const debugFlags = {
  forceStatusApply: false,
};

function describeEffectiveness(multiplier: number): string | null {
  if (multiplier === 0) return "It had no effect…";
  if (multiplier < 1) return "It's not very effective…";
  if (multiplier > 1) return "It's super effective!";
  return null;
}

/**
 * Run a technique: roll accuracy, then apply each effect in order.
 *
 * The executor mutates `attacker` / `defender` (HP, status) and returns a
 * flat event log for the combat UI to consume.
 */
export function executeTechnique(
  attacker: Monster,
  defender: Monster,
  technique: TechniqueDef,
  isPlayer: boolean,
): ExecutorEvent[] {
  const events: ExecutorEvent[] = [];
  events.push({
    type: "attack_use",
    message: `${attacker.name} uses ${technique.name}!`,
  });

  if (!rollAccuracy(technique.accuracy)) {
    events.push({ type: "miss", message: "It missed!" });
    return events;
  }

  for (const effect of technique.effects) {
    events.push(...applyEffect(effect, attacker, defender, technique));
    // Bail if the defender fainted from a damage effect — later effects
    // (status apply, etc.) shouldn't pile on once HP is at 0.
    if (defender.currentHp <= 0) break;
  }

  // Silence unused param warning — kept for future per-side logging hooks.
  void isPlayer;
  return events;
}

function applyEffect(
  effect: TechniqueEffect,
  attacker: Monster,
  defender: Monster,
  technique: TechniqueDef,
): ExecutorEvent[] {
  switch (effect.kind) {
    case "damage": {
      const { damage, effectiveness } = calculateDamage(
        attacker,
        technique,
        defender,
        effect.power,
      );
      defender.currentHp = Math.max(0, defender.currentHp - damage);
      const events: ExecutorEvent[] = [
        {
          type: "damage",
          message: `${defender.name} took ${damage} damage!`,
          amount: damage,
        },
      ];
      const effMsg = describeEffectiveness(effectiveness);
      if (effMsg) {
        events.push({ type: "effectiveness", message: effMsg, effectiveness });
      }
      return events;
    }
    case "applyStatus": {
      const target = effect.target === "self" ? attacker : defender;
      if (!debugFlags.forceStatusApply && Math.random() >= effect.chance) {
        return [];
      }
      const applyMsg = applyStatus(target, effect.status);
      if (!applyMsg) {
        // Already had the status — no event.
        return [];
      }
      return [{ type: "status_apply", message: applyMsg }];
    }
    case "heal": {
      const target = effect.target === "self" ? attacker : defender;
      const before = target.currentHp;
      target.currentHp = Math.min(target.maxHp, target.currentHp + effect.amount);
      const healed = target.currentHp - before;
      return [
        {
          type: "heal",
          message: `${target.name} recovered ${healed} HP!`,
          amount: healed,
        },
      ];
    }
    case "statStage": {
      const target = effect.target === "self" ? attacker : defender;
      const current = target.statStages[effect.stat];
      const { newStage, clamped } = adjustStage(current, effect.delta);
      if (clamped && newStage === current) {
        return [
          {
            type: "stat_stage",
            message: `${target.name}'s ${effect.stat} can't go ${effect.delta > 0 ? "higher" : "lower"}!`,
          },
        ];
      }
      target.statStages[effect.stat] = newStage;
      return [
        {
          type: "stat_stage",
          message: describeStageChange(target.name, effect.stat, effect.delta),
        },
      ];
    }
  }
}

function describeStageChange(name: string, stat: string, delta: number): string {
  const direction = delta > 0 ? "rose" : "fell";
  const intensity = Math.abs(delta) >= 2 ? " sharply" : "";
  return `${name}'s ${stat} ${direction}${intensity}!`;
}
