import { describe, it, expect } from "vitest";
import { Monster } from "../game/model/Monster";
import { xpForLevel } from "../game/combat/formula";

describe("Monster.spawn", () => {
  it("creates a rockitten at level 5 with correct stats", () => {
    // rockitten uses the upstream "hunter" shape:
    //   hp=5, melee=8, ranged=4, armor=4, dodge=8, speed=7
    // stat = base * (level + 7) = base * 12
    const m = Monster.spawn("rockitten", 5);
    expect(m.slug).toBe("rockitten");
    expect(m.name).toBe("Rockitten");
    expect(m.level).toBe(5);
    expect(m.maxHp).toBe(5 * 12); // 60
    expect(m.melee).toBe(8 * 12); // 96
    expect(m.ranged).toBe(4 * 12); // 48
    expect(m.armor).toBe(4 * 12); // 48
    expect(m.dodge).toBe(8 * 12); // 96
    expect(m.speed).toBe(7 * 12); // 84
    expect(m.currentHp).toBe(m.maxHp);
  });

  it("includes techniques learned at or below the monster's level", () => {
    const m = Monster.spawn("rockitten", 1);
    expect(m.techniques.map((t) => t.slug)).toEqual(["ram", "boulder"]);
  });

  it("includes additional techniques unlocked by level 5", () => {
    const m = Monster.spawn("rockitten", 5);
    expect(m.techniques.map((t) => t.slug)).toEqual(["ram", "boulder", "mudslide"]);
  });

  it("starts with full HP", () => {
    const m = Monster.spawn("rockitten", 3);
    expect(m.currentHp).toBe(m.maxHp);
  });

  it("throws for unknown monster slug", () => {
    expect(() => Monster.spawn("unknown", 1)).toThrow("Unknown monster");
  });
});

describe("Monster.addXp", () => {
  it("returns null summary when no level is gained", () => {
    const m = Monster.spawn("rockitten", 5);
    const result = m.addXp(1);
    expect(result.levelUps).toEqual([]);
    expect(result.summary).toBeNull();
    expect(m.level).toBe(5);
  });

  it("returns single-level summary covering one boundary", () => {
    const m = Monster.spawn("rockitten", 5);
    const oldHp = m.maxHp;
    // Award just enough XP to tip from L5 to L6 (no further).
    const result = m.addXp(xpForLevel(6) - m.totalXp);
    expect(result.levelUps).toHaveLength(1);
    expect(result.summary).not.toBeNull();
    expect(result.summary!.startLevel).toBe(5);
    expect(result.summary!.endLevel).toBe(6);
    expect(result.summary!.oldStats.maxHp).toBe(oldHp);
    expect(result.summary!.newStats.maxHp).toBe(m.maxHp);
    expect(result.summary!.newStats.maxHp).toBeGreaterThan(result.summary!.oldStats.maxHp);
  });

  it("collapses multi-level jump into ONE summary (upstream parity)", () => {
    // Upstream `consume_levelup_summary` returns a single (start, end, diff)
    // tuple per XP grant even when N>1 levels are crossed (see
    // upstream/tuxemon/monster/monster.py:603-649). Mirror that here so the
    // popup shows one combined card, not N stacked cards.
    const m = Monster.spawn("rockitten", 5);
    const oldStats = {
      maxHp: m.maxHp,
      melee: m.melee,
      ranged: m.ranged,
      armor: m.armor,
      dodge: m.dodge,
      speed: m.speed,
    };
    // Tip straight past L6 to L7 in one grant.
    const result = m.addXp(xpForLevel(7) - m.totalXp);
    expect(result.levelUps).toHaveLength(2);
    expect(result.summary).not.toBeNull();
    expect(result.summary!.startLevel).toBe(5);
    expect(result.summary!.endLevel).toBe(7);
    // Summary oldStats must match the pre-grant snapshot, not the
    // intermediate L6 stats.
    expect(result.summary!.oldStats).toEqual(oldStats);
    expect(result.summary!.newStats.maxHp).toBe(m.maxHp);
  });
});
