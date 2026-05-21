import type { Monster } from "../model/Monster";
import type { TechniqueDef, TechniqueEffect } from "../data/techniques";
import { calculateDamage, rollAccuracy } from "./formula";
import { previewApplyStatus } from "./statusHandler";
import { adjustStage } from "./statStages";

/**
 * One entry of the combat narration log. The `apply` closure performs the
 * model mutation associated with this event (e.g. deducting HP for `damage`,
 * pushing a status entry for `status_apply`). The CombatScene runs `apply`
 * at the moment it displays `message`, keeping the HUD in lockstep with
 * narration. Events that are pure narration (`attack_use`, `miss`,
 * `effectiveness`) leave `apply` undefined.
 *
 * STORY-0233: Damage/HP/status are no longer applied during turn resolution.
 * The executor instead computes the post-attack numbers up front (RNG locked
 * in here so order is deterministic) and bakes them into `apply` closures.
 */
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
  /**
   * Performs the model mutation tied to this event. Invoked by the narrator
   * (CombatScene.processNextEvent) at the moment `message` is displayed,
   * NOT when `executeTechnique` runs.
   */
  apply?: () => void;
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
 * Run a technique: roll accuracy and damage now (RNG locked in at decision
 * time so narration order is deterministic), but DEFER the model mutations
 * into per-event `apply` closures. The caller drains those closures in
 * lockstep with narration — see CombatScene.processNextEvent.
 *
 * Branching that needs to know post-effect state ("did the defender faint?
 * → skip later effects on the same turn") is decided here against a
 * `projectedHp` local; the same number is baked into the damage event's
 * closure so the live model lands on it when the narrator runs `apply`.
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

  // Track the defender's projected HP across effects so we can early-exit
  // on faint without consulting `defender.currentHp` (which still holds the
  // pre-turn value because mutations are deferred).
  let projectedDefenderHp = defender.currentHp;

  for (const effect of technique.effects) {
    const effectEvents = applyEffect(effect, attacker, defender, technique, projectedDefenderHp);
    for (const ev of effectEvents) {
      events.push(ev);
      if (ev.type === "damage" && typeof ev.amount === "number") {
        projectedDefenderHp = Math.max(0, projectedDefenderHp - ev.amount);
      }
    }
    // Bail if the defender would faint from a damage effect — later effects
    // (status apply, etc.) shouldn't pile on once HP is at 0.
    if (projectedDefenderHp <= 0) break;
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
  projectedDefenderHp: number,
): ExecutorEvent[] {
  switch (effect.kind) {
    case "damage": {
      const { damage, effectiveness } = calculateDamage(
        attacker,
        technique,
        defender,
        effect.power,
      );
      // Message reports raw damage; the closure clamps to >= 0 at apply
      // time. `projectedDefenderHp` is used only for projection
      // bookkeeping in the caller (decides faint branching).
      const events: ExecutorEvent[] = [
        {
          type: "damage",
          message: `${defender.name} took ${damage} damage!`,
          amount: damage,
          apply: () => {
            defender.currentHp = Math.max(0, defender.currentHp - damage);
          },
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
      // Status apply: ask the handler what message would fire (and whether
      // the apply itself is a no-op due to an existing status). We still
      // defer the actual `monster.status.push` into the closure.
      const preview = previewApplyStatus(target, effect.status);
      if (!preview) {
        // Already had the status — no event.
        return [];
      }
      return [
        {
          type: "status_apply",
          message: preview.message,
          apply: preview.apply,
        },
      ];
    }
    case "heal": {
      const target = effect.target === "self" ? attacker : defender;
      // Message reports the raw heal amount; closure clamps at maxHp.
      void projectedDefenderHp;
      return [
        {
          type: "heal",
          message: `${target.name} recovered ${effect.amount} HP!`,
          amount: effect.amount,
          apply: () => {
            target.currentHp = Math.min(target.maxHp, target.currentHp + effect.amount);
          },
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
      return [
        {
          type: "stat_stage",
          message: describeStageChange(target.name, effect.stat, effect.delta),
          apply: () => {
            target.statStages[effect.stat] = newStage;
          },
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
