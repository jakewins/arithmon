import { describe, expect, it, vi } from "vitest";
import {
  getEncounterTable,
  isDaytime,
  rollEncounter,
  type EncounterEntry,
} from "../game/data/encounters";

/**
 * Encounter-table sanity tests. The spyder_route2 table is the only one we
 * port verbatim with day/night gating today (STORY-0219); the rest of the
 * registry just needs to remain wired up. Lean on table-style assertions so
 * adding new maps doesn't bloat the test count.
 */

describe("getEncounterTable", () => {
  it("returns undefined for an unknown map key", () => {
    expect(getEncounterTable("does_not_exist")).toBeUndefined();
  });

  it("returns the verbatim spyder_route2 port from upstream YAML", () => {
    const table = getEncounterTable("spyder_route2");
    expect(table).toBeDefined();
    // 5 species × 2 daytimes = 10 entries, matching upstream
    // db/encounter/spyder_route2.yaml.
    expect(table).toHaveLength(10);

    // Day rows.
    expect(table).toContainEqual<EncounterEntry>({
      slug: "cardiling",
      minLevel: 3,
      maxLevel: 6,
      weight: 2.5,
      daytime: true,
    });
    expect(table).toContainEqual<EncounterEntry>({
      slug: "aardorn",
      minLevel: 3,
      maxLevel: 6,
      weight: 2.5,
      daytime: true,
    });
    expect(table).toContainEqual<EncounterEntry>({
      slug: "eyenemy",
      minLevel: 3,
      maxLevel: 6,
      weight: 2.5,
      daytime: true,
    });
    expect(table).toContainEqual<EncounterEntry>({
      slug: "axolightl",
      minLevel: 4,
      maxLevel: 7,
      weight: 1.0,
      daytime: true,
    });
    expect(table).toContainEqual<EncounterEntry>({
      slug: "cataspike",
      minLevel: 3,
      maxLevel: 6,
      weight: 2.5,
      daytime: true,
    });

    // Night rows — aardorn/eyenemy/axolightl/cataspike all bump to higher
    // level ranges; cardiling alone stays at the day range.
    expect(table).toContainEqual<EncounterEntry>({
      slug: "cardiling",
      minLevel: 3,
      maxLevel: 6,
      weight: 2.5,
      daytime: false,
    });
    expect(table).toContainEqual<EncounterEntry>({
      slug: "aardorn",
      minLevel: 4,
      maxLevel: 8,
      weight: 2.5,
      daytime: false,
    });
    expect(table).toContainEqual<EncounterEntry>({
      slug: "eyenemy",
      minLevel: 4,
      maxLevel: 8,
      weight: 2.5,
      daytime: false,
    });
    expect(table).toContainEqual<EncounterEntry>({
      slug: "axolightl",
      minLevel: 5,
      maxLevel: 8,
      weight: 1.0,
      daytime: false,
    });
    expect(table).toContainEqual<EncounterEntry>({
      slug: "cataspike",
      minLevel: 4,
      maxLevel: 8,
      weight: 2.5,
      daytime: false,
    });
  });
});

describe("isDaytime", () => {
  it.each([
    ["dawn", true],
    ["morning", true],
    ["day", true],
    ["dusk", false],
    ["night", false],
  ])("maps timeStage %s -> daytime %s", (stage, expected) => {
    expect(isDaytime(stage)).toBe(expected);
  });
});

describe("rollEncounter", () => {
  const table = getEncounterTable("spyder_route2")!;

  it("only picks daytime entries when daytime=true", () => {
    // Force Math.random to deterministic sweeps so every row gets visited.
    const spy = vi.spyOn(Math, "random");
    try {
      for (let i = 0; i < 100; i++) {
        spy.mockReturnValue(i / 100);
        const { slug, level } = rollEncounter(table, true);
        const matches = table.filter((e) => e.slug === slug && e.daytime === true);
        expect(matches.length).toBeGreaterThan(0);
        // Level must fall inside at least one day-row's range for this slug.
        const inRange = matches.some((e) => level >= e.minLevel && level <= e.maxLevel);
        expect(inRange).toBe(true);
      }
    } finally {
      spy.mockRestore();
    }
  });

  it("only picks nighttime entries when daytime=false", () => {
    const spy = vi.spyOn(Math, "random");
    try {
      for (let i = 0; i < 100; i++) {
        spy.mockReturnValue(i / 100);
        const { slug, level } = rollEncounter(table, false);
        const matches = table.filter((e) => e.slug === slug && e.daytime === false);
        expect(matches.length).toBeGreaterThan(0);
        const inRange = matches.some((e) => level >= e.minLevel && level <= e.maxLevel);
        expect(inRange).toBe(true);
      }
    } finally {
      spy.mockRestore();
    }
  });

  it("falls back to the full table if the daytime filter zeros out the pool", () => {
    const allDay: EncounterEntry[] = [
      { slug: "axolightl", minLevel: 1, maxLevel: 2, weight: 1, daytime: true },
    ];
    // daytime=false should filter everything out — verify we still get a
    // valid pick instead of crashing on an empty pool.
    const { slug } = rollEncounter(allDay, false);
    expect(slug).toBe("axolightl");
  });
});
