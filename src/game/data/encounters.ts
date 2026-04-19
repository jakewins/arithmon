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
  spyder_route3: [
    { slug: "cardiling", minLevel: 7, maxLevel: 12, weight: 2.0 },
    { slug: "elofly", minLevel: 7, maxLevel: 11, weight: 2.0 },
    { slug: "squabbit", minLevel: 8, maxLevel: 12, weight: 1.0 },
    { slug: "shybulb", minLevel: 7, maxLevel: 11, weight: 2.5 },
  ],
  spyder_mansion: [
    { slug: "cairfrey", minLevel: 13, maxLevel: 17, weight: 2.0 },
    { slug: "polyrock", minLevel: 13, maxLevel: 16, weight: 2.0 },
    { slug: "djinnbo", minLevel: 14, maxLevel: 17, weight: 0.8 },
  ],
  spyder_mansion_basement: [
    { slug: "cairfrey", minLevel: 14, maxLevel: 17, weight: 2.0 },
    { slug: "polyrock", minLevel: 14, maxLevel: 17, weight: 2.5 },
    { slug: "djinnbo", minLevel: 15, maxLevel: 17, weight: 1.0 },
  ],
  spyder_mansion_top: [
    { slug: "djinnbo", minLevel: 15, maxLevel: 17, weight: 2.0 },
    { slug: "cairfrey", minLevel: 15, maxLevel: 17, weight: 1.5 },
  ],
  spyder_route4: [
    { slug: "elofly", minLevel: 11, maxLevel: 16, weight: 2.0 },
    { slug: "sapsnap", minLevel: 12, maxLevel: 16, weight: 1.0 },
    { slug: "aardorn", minLevel: 11, maxLevel: 15, weight: 2.5 },
    { slug: "katapill", minLevel: 11, maxLevel: 14, weight: 2.0 },
  ],
  spyder_routeA: [
    { slug: "shybulb", minLevel: 12, maxLevel: 15, weight: 2.5 },
    { slug: "katapill", minLevel: 12, maxLevel: 15, weight: 2.0 },
    { slug: "anoleaf", minLevel: 13, maxLevel: 15, weight: 1.0 },
  ],
  spyder_route5: [
    { slug: "foofle", minLevel: 16, maxLevel: 23, weight: 2.0 },
    { slug: "vamporm", minLevel: 17, maxLevel: 23, weight: 2.0 },
    { slug: "dracune", minLevel: 18, maxLevel: 23, weight: 0.5 },
  ],
  spyder_route6: [
    { slug: "dandicub", minLevel: 19, maxLevel: 23, weight: 2.5 },
    { slug: "dandylion", minLevel: 20, maxLevel: 23, weight: 1.0 },
    { slug: "capiti", minLevel: 19, maxLevel: 23, weight: 2.0 },
  ],
  spyder_leather_shaft1: [
    { slug: "capiti", minLevel: 20, maxLevel: 25, weight: 2.0 },
    { slug: "polyrock", minLevel: 20, maxLevel: 25, weight: 2.0 },
  ],
  spyder_leather_shaft2: [
    { slug: "capiti", minLevel: 22, maxLevel: 27, weight: 2.0 },
    { slug: "polyrock", minLevel: 22, maxLevel: 27, weight: 1.5 },
    { slug: "dracune", minLevel: 23, maxLevel: 27, weight: 0.5 },
  ],
  spyder_cotton_tunnel: [
    { slug: "dinoflop", minLevel: 25, maxLevel: 40, weight: 2.0 },
    { slug: "furnursus", minLevel: 28, maxLevel: 40, weight: 1.5 },
    { slug: "boltnu", minLevel: 25, maxLevel: 38, weight: 2.0 },
    { slug: "metesaur", minLevel: 30, maxLevel: 40, weight: 1.0 },
  ],
  spyder_dragons_cave: [
    { slug: "agnite", minLevel: 20, maxLevel: 28, weight: 2.5 },
    { slug: "agnidon", minLevel: 24, maxLevel: 28, weight: 0.5 },
    { slug: "embra", minLevel: 22, maxLevel: 28, weight: 2.0 },
  ],
  spyder_dryads_grove: [
    { slug: "coleorus", minLevel: 22, maxLevel: 28, weight: 0.8 },
    { slug: "tourbidi", minLevel: 20, maxLevel: 28, weight: 2.0 },
    { slug: "shybulb", minLevel: 20, maxLevel: 26, weight: 2.5 },
  ],
  spyder_routeB: [
    { slug: "toufigel", minLevel: 20, maxLevel: 28, weight: 2.0 },
    { slug: "pipis", minLevel: 20, maxLevel: 26, weight: 2.5 },
    { slug: "strella", minLevel: 22, maxLevel: 28, weight: 0.8 },
  ],
  spyder_routeC: [
    { slug: "pipis", minLevel: 22, maxLevel: 28, weight: 2.0 },
    { slug: "toufigel", minLevel: 22, maxLevel: 28, weight: 2.0 },
  ],
  spyder_datacenter: [
    { slug: "pythwire", minLevel: 40, maxLevel: 50, weight: 1.0 },
    { slug: "ouroboutlet", minLevel: 42, maxLevel: 50, weight: 0.8 },
    { slug: "sockeserp", minLevel: 40, maxLevel: 48, weight: 1.0 },
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
