/**
 * Stat stages: temporary in-battle modifiers in the range [-6, +6].
 * Each stage applies a fixed multiplier from the classic Gen II+ table:
 *   stage -6  →  2/8 (0.25x)
 *   stage  0  →  1.0x
 *   stage +6  →  8/2 (4.0x)
 *
 * Stages reset between battles.
 */

export const STAT_STAGE_MIN = -6;
export const STAT_STAGE_MAX = 6;

export type StatName = "melee" | "ranged" | "armor" | "dodge" | "speed" | "accuracy";

export interface StatStages {
  melee: number;
  ranged: number;
  armor: number;
  dodge: number;
  speed: number;
  accuracy: number;
}

export function freshStatStages(): StatStages {
  return { melee: 0, ranged: 0, armor: 0, dodge: 0, speed: 0, accuracy: 0 };
}

/** Convert a stage in [-6, +6] to its multiplier. */
export function stageMultiplier(stage: number): number {
  const s = Math.max(STAT_STAGE_MIN, Math.min(STAT_STAGE_MAX, stage));
  if (s >= 0) return (2 + s) / 2;
  return 2 / (2 - s);
}

export function effectiveStat(base: number, stage: number): number {
  return base * stageMultiplier(stage);
}

/**
 * Apply a delta to a stage and return the resulting stage along with a flag
 * indicating whether the change was clamped at the min/max boundary. Callers
 * use the clamp flag to surface "X's stat can't go any higher!" messages.
 */
export interface StageAdjustResult {
  oldStage: number;
  newStage: number;
  clamped: boolean;
}

export function adjustStage(current: number, delta: number): StageAdjustResult {
  const proposed = current + delta;
  const newStage = Math.max(STAT_STAGE_MIN, Math.min(STAT_STAGE_MAX, proposed));
  return {
    oldStage: current,
    newStage,
    clamped: newStage !== proposed,
  };
}
