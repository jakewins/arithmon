/**
 * Tracks which monster species the player has seen and caught,
 * mirroring Tuxemon's journal/Pokedex tracking.
 */
export interface MonsterRegistry {
  /** Monster slugs encountered in combat. */
  readonly seen: ReadonlySet<string>;
  /** Monster slugs successfully captured. */
  readonly caught: ReadonlySet<string>;
}

export function createMonsterRegistry(): MonsterRegistry {
  return {
    seen: new Set<string>(),
    caught: new Set<string>(),
  };
}

export function markSeen(registry: MonsterRegistry, slug: string): void {
  (registry.seen as Set<string>).add(slug);
}

export function markCaught(registry: MonsterRegistry, slug: string): void {
  (registry.caught as Set<string>).add(slug);
  // Catching implies seeing
  (registry.seen as Set<string>).add(slug);
}

export type RegistrationStatus = "unknown" | "seen" | "caught";

export function getStatus(registry: MonsterRegistry, slug: string): RegistrationStatus {
  if (registry.caught.has(slug)) return "caught";
  if (registry.seen.has(slug)) return "seen";
  return "unknown";
}
