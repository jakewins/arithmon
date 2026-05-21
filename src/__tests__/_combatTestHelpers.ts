import type { CombatEvent } from "../game/combat/machine";

/**
 * STORY-0233: combat turns are now resolved as a list of `CombatEvent`s
 * each carrying an `apply` closure. The live model is unchanged until
 * those closures run. Tests that previously asserted post-`submitAction`
 * model state need to drain the returned events first.
 *
 * Use this in tests that don't care about per-step intermediate state —
 * it's the equivalent of letting the CombatScene narrator play through
 * the entire turn. Tests that want to verify "HP unchanged before damage
 * narrates" should drain events one at a time and snapshot between
 * steps.
 */
export function drainEvents(events: CombatEvent[]): void {
  for (const e of events) e.apply?.();
}
