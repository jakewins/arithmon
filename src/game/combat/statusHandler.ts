import type { Monster } from "../model/Monster";
import { STATUSES, type StatusSlug, type StatusInstance } from "../data/statuses";

/**
 * Apply a status to a monster. Returns the apply message if applied, or null
 * if the monster already has it (statuses don't stack — re-application is a
 * no-op, matching upstream's `replaced` behavior for negative-on-negative).
 */
export function applyStatus(monster: Monster, slug: StatusSlug): string | null {
  if (hasStatus(monster, slug)) return null;
  const def = STATUSES[slug];
  monster.status.push({ slug, turnsRemaining: def.duration });
  return def.applyMessage(monster);
}

export function hasStatus(monster: Monster, slug: StatusSlug): boolean {
  return monster.status.some((s) => s.slug === slug);
}

export function clearStatus(monster: Monster, slug: StatusSlug): void {
  monster.status = monster.status.filter((s) => s.slug !== slug);
}

export function clearAllStatuses(monster: Monster): void {
  monster.status = [];
}

/**
 * Return true if any active status gates the monster's action this turn
 * (e.g. sleep). The status that gated is the first matching one.
 */
export function gatesAction(monster: Monster): StatusInstance | null {
  return monster.status.find((s) => STATUSES[s.slug].gatesAction()) ?? null;
}

/**
 * Melee output multiplier from all active statuses (multiplied together).
 * Used by `calculateDamage` to apply burn's melee debuff inline.
 */
export function meleeMultiplier(monster: Monster): number {
  let m = 1;
  for (const s of monster.status) {
    const mult = STATUSES[s.slug].meleeOutputMultiplier;
    if (typeof mult === "number") m *= mult;
  }
  return m;
}

export interface StatusLogEvent {
  type: "status_tick" | "status_wear_off";
  message: string;
  slug: StatusSlug;
  damage?: number;
}

/**
 * Tick all statuses on a monster at end-of-turn. Each status:
 *   1. Runs its `onTurnEnd` callback (may damage the monster).
 *   2. Decrements `turnsRemaining`; when 0, the status wears off.
 *
 * Statuses are processed in apply order. Returns a log of events.
 */
export function tickStatuses(monster: Monster): StatusLogEvent[] {
  const events: StatusLogEvent[] = [];
  const survivors: StatusInstance[] = [];
  for (const instance of monster.status) {
    const def = STATUSES[instance.slug];
    const tick = def.onTurnEnd(monster);
    if (tick) {
      events.push({
        type: "status_tick",
        message: tick.message,
        slug: instance.slug,
        damage: tick.damage,
      });
    }
    instance.turnsRemaining -= 1;
    if (instance.turnsRemaining <= 0) {
      events.push({
        type: "status_wear_off",
        message: def.wearOffMessage(monster),
        slug: instance.slug,
      });
    } else {
      survivors.push(instance);
    }
  }
  monster.status = survivors;
  return events;
}
