/**
 * Per-map encounter tables. Each entry lists the wild monsters that
 * can appear on that map, with level ranges and relative weights.
 */
export interface EncounterEntry {
  slug: string;
  minLevel: number;
  maxLevel: number;
  weight: number;
}

const ENCOUNTER_TABLES: Record<string, EncounterEntry[]> = {
  spyder_route1: [
    { slug: "pairagrin", minLevel: 2, maxLevel: 4, weight: 3.5 },
    { slug: "aardorn", minLevel: 2, maxLevel: 4, weight: 3.5 },
    { slug: "cataspike", minLevel: 2, maxLevel: 4, weight: 3.5 },
  ],
  spyder_route2: [
    { slug: "cardiling", minLevel: 3, maxLevel: 8, weight: 2.5 },
    { slug: "aardorn", minLevel: 3, maxLevel: 8, weight: 2.5 },
    { slug: "eyenemy", minLevel: 3, maxLevel: 6, weight: 1.5 },
    { slug: "axolightl", minLevel: 4, maxLevel: 8, weight: 1.0 },
    { slug: "cataspike", minLevel: 3, maxLevel: 7, weight: 2.0 },
  ],
  spyder_citypark: [
    { slug: "cardiling", minLevel: 5, maxLevel: 11, weight: 2.0 },
    { slug: "aardorn", minLevel: 5, maxLevel: 11, weight: 2.0 },
    { slug: "eyenemy", minLevel: 6, maxLevel: 11, weight: 2.0 },
    { slug: "axolightl", minLevel: 6, maxLevel: 10, weight: 1.5 },
    { slug: "cataspike", minLevel: 5, maxLevel: 9, weight: 2.0 },
  ],
};

/** Default encounter pool used when no map-specific table exists. */
const DEFAULT_POOL: EncounterEntry[] = [
  { slug: "rockitten", minLevel: 4, maxLevel: 6, weight: 1 },
  { slug: "budaye", minLevel: 4, maxLevel: 6, weight: 1 },
  { slug: "ignibus", minLevel: 4, maxLevel: 6, weight: 1 },
  { slug: "grintot", minLevel: 4, maxLevel: 6, weight: 1 },
  { slug: "dollfin", minLevel: 4, maxLevel: 6, weight: 1 },
];

/** Get the encounter table for a map, or the default pool. */
export function getEncounterTable(mapKey: string): EncounterEntry[] {
  return ENCOUNTER_TABLES[mapKey] ?? DEFAULT_POOL;
}

/** Pick a random encounter from a table using weighted selection. */
export function rollEncounter(table: EncounterEntry[]): { slug: string; level: number } {
  const totalWeight = table.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) {
      const level =
        entry.minLevel + Math.floor(Math.random() * (entry.maxLevel - entry.minLevel + 1));
      return { slug: entry.slug, level };
    }
  }
  // Fallback (shouldn't reach here)
  const last = table[table.length - 1];
  return { slug: last.slug, level: last.minLevel };
}
