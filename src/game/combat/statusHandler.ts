import type { Monster } from "../model/Monster";
import { STATUSES, type StatusSlug, type StatusInstance } from "../data/statuses";

/**
 * Apply a status to a monster immediately. Returns the apply message if
 * applied, or null if the monster already has it (statuses don't stack —
 * re-application is a no-op, matching upstream's `replaced` behavior for
 * negative-on-negative).
 *
 * Use {@link previewApplyStatus} from combat code that needs to defer the
 * mutation into a narration-step `apply` closure (STORY-0233).
 */
export function applyStatus(monster: Monster, slug: StatusSlug): string | null {
  if (hasStatus(monster, slug)) return null;
  const def = STATUSES[slug];
  monster.status.push({ slug, turnsRemaining: def.duration });
  return def.applyMessage(monster);
}

/**
 * Like {@link applyStatus} but does NOT mutate. Returns `{ message, apply }`
 * — the caller invokes `apply()` at the moment its narration message shows.
 * Returns null if the monster already has the status (no narration needed).
 */
export function previewApplyStatus(
  monster: Monster,
  slug: StatusSlug,
): { message: string; apply: () => void } | null {
  if (hasStatus(monster, slug)) return null;
  const def = STATUSES[slug];
  return {
    message: def.applyMessage(monster),
    apply: () => {
      // Re-check at apply time: an earlier closure in the same drain may
      // have already added the status (unlikely in current flows, but safe).
      if (hasStatus(monster, slug)) return;
      monster.status.push({ slug, turnsRemaining: def.duration });
    },
  };
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
  /**
   * STORY-0233: closure that performs the mutation tied to this event
   * (tick damage + duration decrement, or status removal). The narrator
   * runs it in lockstep with the message; `tickStatuses` itself does
   * not mutate the monster.
   */
  apply: () => void;
}

/**
 * Compute the end-of-turn status pass for one monster without mutating.
 *
 * Per status, in apply order:
 *   - If `onTurnEnd` returns a tick: emit one `status_tick` event whose
 *     closure applies the damage AND decrements `turnsRemaining`.
 *   - If the resulting `turnsRemaining` would be ≤ 0: emit one
 *     `status_wear_off` event whose closure removes the status instance
 *     entirely. (When the status also ticks, the tick closure decrements
 *     and the wear-off closure removes — both fire in narration order.)
 *   - If the status has no tick AND no wear-off this turn (e.g. sleep
 *     mid-duration): we still need to decrement, so we fold the decrement
 *     into the wear-off closure when it eventually fires. For pure-gating
 *     statuses with multiple turns remaining we still emit a quiet tick
 *     event (empty message) carrying just the decrement — the machine
 *     filters those out before handing the queue to the narrator.
 *
 * `monster.status` and `monster.currentHp` stay unchanged until the
 * returned closures are drained.
 */
export function tickStatuses(monster: Monster): StatusLogEvent[] {
  const events: StatusLogEvent[] = [];
  let projectedHp = monster.currentHp;

  for (const instance of monster.status) {
    const def = STATUSES[instance.slug];
    const tick = def.onTurnEnd(monster);
    const after = instance.turnsRemaining - 1;
    const wearOff = after <= 0;

    if (tick) {
      // Cap the displayed damage at the projected HP so the message and the
      // eventual HP-bar tween land on the same number.
      const dmg = Math.min(tick.damage, projectedHp);
      projectedHp = Math.max(0, projectedHp - dmg);
      const message =
        dmg === tick.damage ? tick.message : tick.message.replace(`${tick.damage}`, `${dmg}`);
      events.push({
        type: "status_tick",
        message,
        slug: instance.slug,
        damage: dmg,
        apply: () => {
          monster.currentHp = Math.max(0, monster.currentHp - dmg);
          instance.turnsRemaining = after;
        },
      });
    } else if (!wearOff) {
      // Pure gating status, still ticking down — emit a quiet decrement.
      // Filtered out by the machine before narration.
      events.push({
        type: "status_tick",
        message: "",
        slug: instance.slug,
        apply: () => {
          instance.turnsRemaining = after;
        },
      });
    }

    if (wearOff) {
      events.push({
        type: "status_wear_off",
        message: def.wearOffMessage(monster),
        slug: instance.slug,
        apply: () => {
          // If tick already fired its apply, turnsRemaining is already 0;
          // if not (no-tick path), we need to decrement before removing
          // so the live value stays consistent for any external readers.
          instance.turnsRemaining = 0;
          monster.status = monster.status.filter((s) => s !== instance);
        },
      });
    }
  }

  return events;
}
