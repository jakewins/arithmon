import { describe, it, expect } from "vitest";
import { Monster } from "../game/model/Monster";

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
