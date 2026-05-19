import { ELEMENTS, type ElementSlug } from "../data/elements";
import { MONSTERS } from "../data/monsters";
import { TECHNIQUES } from "../data/techniques";

/**
 * Returns the cumulative effectiveness multiplier when an attack of
 * `attackElement` hits a defender with `defenderTypes`. For dual-typed
 * defenders, the per-type multipliers stack (multiply).
 *
 * Mirrors upstream `tuxemon/combat/ElementTypesHandler`.
 */
export function effectivenessMultiplier(
  attackElement: ElementSlug,
  defenderTypes: readonly ElementSlug[],
): number {
  const attacker = ELEMENTS[attackElement];
  let multiplier = 1;
  for (const defender of defenderTypes) {
    multiplier *= attacker.against[defender];
  }
  return multiplier;
}

export type EffectivenessTier = "immune" | "not_very_effective" | "neutral" | "super_effective";

export function effectivenessTier(multiplier: number): EffectivenessTier {
  if (multiplier === 0) return "immune";
  if (multiplier < 1) return "not_very_effective";
  if (multiplier > 1) return "super_effective";
  return "neutral";
}

/**
 * Fail-fast validation: every monster's `types` and every technique's `element`
 * must reference a known element. Run at module load.
 */
function validateElementReferences(): void {
  for (const monster of Object.values(MONSTERS)) {
    for (const type of monster.types) {
      if (!(type in ELEMENTS)) {
        throw new Error(`Monster ${monster.slug} references unknown element: ${type}`);
      }
    }
  }
  for (const technique of Object.values(TECHNIQUES)) {
    if (!(technique.element in ELEMENTS)) {
      throw new Error(
        `Technique ${technique.slug} references unknown element: ${technique.element}`,
      );
    }
  }
}

validateElementReferences();
