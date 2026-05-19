/**
 * Status condition definitions, ported (lightly) from
 * `upstream/mods/tuxemon/db/status/*.yaml`. Each status applies a per-turn
 * effect, and may gate a monster from acting on its turn (sleep).
 */

import type { Monster } from "../model/Monster";

export const STATUS_SLUGS = ["poisoned", "burn", "sleep"] as const;
export type StatusSlug = (typeof STATUS_SLUGS)[number];

export interface StatusInstance {
  slug: StatusSlug;
  /** Counts down each end-of-turn tick. Removed when it reaches 0. */
  turnsRemaining: number;
}

export interface StatusTickEvent {
  type: "status_tick";
  /** Damage dealt by this tick. 0 if the status only flavors/gates. */
  damage: number;
  /** Monster that suffered the tick. */
  monster: Monster;
  /** Status that ticked. */
  slug: StatusSlug;
  message: string;
}

export interface StatusDef {
  slug: StatusSlug;
  /** Initial `turnsRemaining` value when applied. */
  duration: number;
  /** Display name surfaced in combat log messages. */
  displayName: string;
  /**
   * End-of-turn tick. May damage the monster (returning an event) or return
   * `null` to indicate no tick-effect (e.g. sleep, which only gates actions).
   */
  onTurnEnd(monster: Monster): StatusTickEvent | null;
  /**
   * If true, the monster cannot act on its turn while this status is active.
   * Sleep returns true; poison/burn return false.
   */
  gatesAction(): boolean;
  /**
   * Multiplier applied to the monster's melee damage output. 1.0 for most;
   * burn halves melee output (modeled inline here until STORY-0069 introduces
   * the stat-stage pipeline).
   */
  meleeOutputMultiplier?: number;
  /** Message shown when this status is first applied. */
  applyMessage(monster: Monster): string;
  /** Message shown when the status wears off naturally. */
  wearOffMessage(monster: Monster): string;
}

/** Default tick damage = 1/8 of max HP, mirroring upstream's `8 weakest`. */
function defaultTickDamage(monster: Monster): number {
  return Math.max(1, Math.floor(monster.maxHp / 8));
}

export const STATUSES: Record<StatusSlug, StatusDef> = {
  poisoned: {
    slug: "poisoned",
    duration: 4,
    displayName: "Poisoned",
    onTurnEnd(monster) {
      const damage = defaultTickDamage(monster);
      monster.currentHp = Math.max(0, monster.currentHp - damage);
      return {
        type: "status_tick",
        damage,
        monster,
        slug: "poisoned",
        message: `${monster.name} took ${damage} poison damage!`,
      };
    },
    gatesAction: () => false,
    applyMessage: (m) => `${m.name} was poisoned!`,
    wearOffMessage: (m) => `${m.name} recovered from poison.`,
  },
  burn: {
    slug: "burn",
    duration: 4,
    displayName: "Burned",
    onTurnEnd(monster) {
      const damage = defaultTickDamage(monster);
      monster.currentHp = Math.max(0, monster.currentHp - damage);
      return {
        type: "status_tick",
        damage,
        monster,
        slug: "burn",
        message: `${monster.name} was hurt by its burn! (${damage})`,
      };
    },
    gatesAction: () => false,
    // Hard-coded melee debuff until STORY-0069 generalizes stat stages.
    meleeOutputMultiplier: 0.5,
    applyMessage: (m) => `${m.name} was burned!`,
    wearOffMessage: (m) => `${m.name}'s burn faded.`,
  },
  sleep: {
    slug: "sleep",
    duration: 2,
    displayName: "Asleep",
    onTurnEnd: () => null,
    gatesAction: () => true,
    applyMessage: (m) => `${m.name} fell asleep!`,
    wearOffMessage: (m) => `${m.name} woke up!`,
  },
};

export function isStatusSlug(value: string): value is StatusSlug {
  return value in STATUSES;
}
