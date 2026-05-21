/**
 * Per-map encounter tables. Each entry lists the wild monsters that
 * can appear on that map, with level ranges and relative weights.
 *
 * Upstream models day/night splits by tagging each row with a `daytime`
 * variable (`true` ⇔ morning/day, `false` ⇔ dusk/night). We mirror that
 * verbatim: an entry's optional `daytime` flag, when set, gates inclusion
 * during the corresponding stage of day. Entries with `daytime` unset are
 * eligible at any time.
 */
export interface EncounterEntry {
  slug: string;
  minLevel: number;
  maxLevel: number;
  weight: number;
  /** True = morning/day only; false = dusk/night only; omit for all-day. */
  daytime?: boolean;
}

const ENCOUNTER_TABLES: Record<string, EncounterEntry[]> = {
  spyder_route1: [
    { slug: "pairagrin", minLevel: 2, maxLevel: 4, weight: 3.5 },
    { slug: "aardorn", minLevel: 2, maxLevel: 4, weight: 3.5 },
    { slug: "cataspike", minLevel: 2, maxLevel: 4, weight: 3.5 },
  ],
  // Verbatim port of upstream/mods/tuxemon/db/encounter/spyder_route2.yaml —
  // 5 species × 2 daytimes = 10 entries. Levels & weights mirror upstream;
  // day vs night gates are applied by `rollEncounter` at roll time.
  spyder_route2: [
    { slug: "cardiling", minLevel: 3, maxLevel: 6, weight: 2.5, daytime: true },
    { slug: "aardorn", minLevel: 3, maxLevel: 6, weight: 2.5, daytime: true },
    { slug: "eyenemy", minLevel: 3, maxLevel: 6, weight: 2.5, daytime: true },
    { slug: "axolightl", minLevel: 4, maxLevel: 7, weight: 1.0, daytime: true },
    { slug: "cataspike", minLevel: 3, maxLevel: 6, weight: 2.5, daytime: true },
    { slug: "cardiling", minLevel: 3, maxLevel: 6, weight: 2.5, daytime: false },
    { slug: "aardorn", minLevel: 4, maxLevel: 8, weight: 2.5, daytime: false },
    { slug: "eyenemy", minLevel: 4, maxLevel: 8, weight: 2.5, daytime: false },
    { slug: "axolightl", minLevel: 5, maxLevel: 8, weight: 1.0, daytime: false },
    { slug: "cataspike", minLevel: 4, maxLevel: 8, weight: 2.5, daytime: false },
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
  // Upstream db/encounter/spyder_omnichannel.yaml — gated on the
  // "omnichannel1wall:yes" puzzle-solved flag (set in spyder_omnichannel2 once
  // the screen is dismantled).
  spyder_omnichannel: [
    { slug: "dark_robo", minLevel: 30, maxLevel: 31, weight: 0.5 },
    { slug: "xeon_2", minLevel: 30, maxLevel: 31, weight: 0.5 },
  ],
};

/** Get the encounter table for a map, or undefined if none exists. */
export function getEncounterTable(mapKey: string): EncounterEntry[] | undefined {
  return ENCOUNTER_TABLES[mapKey];
}

/**
 * Pick a random encounter from a table using weighted selection.
 *
 * If `daytime` is provided, entries with a mismatching `daytime` flag are
 * excluded from the roll. Entries without a `daytime` flag remain eligible
 * regardless. If the resulting filtered table is empty, falls back to the
 * unfiltered table so we never silently swallow encounters when a caller
 * forgets to seed the time-of-day variable.
 */
export function rollEncounter(
  table: EncounterEntry[],
  daytime?: boolean,
): { slug: string; level: number } {
  const filtered =
    daytime === undefined
      ? table
      : table.filter((e) => e.daytime === undefined || e.daytime === daytime);
  const pool = filtered.length > 0 ? filtered : table;
  const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) {
      const level =
        entry.minLevel + Math.floor(Math.random() * (entry.maxLevel - entry.minLevel + 1));
      return { slug: entry.slug, level };
    }
  }
  // Fallback (shouldn't reach here)
  const last = pool[pool.length - 1];
  return { slug: last.slug, level: last.minLevel };
}

/**
 * QA-only overrides for `random_encounter`:
 *   - `forceRoll`: skip the per-step probability check and ALWAYS trigger
 *     an encounter (lets tests fire a wild battle deterministically).
 *   - `suppress`: skip the probability check and NEVER trigger (lets tests
 *     drive cutscenes that overlap a grass tile without race-condition flakes
 *     when both events live on the same trigger column).
 * Reset both to `false` after the test to avoid leaking into adjacent runs.
 */
export const encounterDebugFlags = { forceRoll: false, suppress: false };

/**
 * Map a `GameSession.timeStage` value to upstream's `daytime` boolean.
 * Mirrors Tuxemon: morning/day ⇒ daytime=true, dusk/night ⇒ daytime=false.
 * Dawn is treated as daytime — see upstream's `change_state` discussion;
 * our own `update_time` brackets dawn at 5–7am for symmetry with dusk.
 */
export function isDaytime(timeStage: string): boolean {
  return timeStage === "dawn" || timeStage === "morning" || timeStage === "day";
}
