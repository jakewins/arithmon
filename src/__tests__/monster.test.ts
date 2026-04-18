import { describe, it, expect } from "vitest";
import { Monster } from "../game/model/Monster";

describe("Monster.spawn", () => {
  it("creates a rockitten at level 5 with correct stats", () => {
    const m = Monster.spawn("rockitten", 5);
    // stat = base * (level + 7) = base * 12
    expect(m.slug).toBe("rockitten");
    expect(m.name).toBe("Rockitten");
    expect(m.level).toBe(5);
    expect(m.maxHp).toBe(8 * 12); // 96
    expect(m.attack).toBe(6 * 12); // 72
    expect(m.defense).toBe(6 * 12); // 72
    expect(m.speed).toBe(6 * 12); // 72
    expect(m.currentHp).toBe(m.maxHp);
  });

  it("includes techniques learned at or below the monster's level", () => {
    const m = Monster.spawn("rockitten", 1);
    expect(m.techniques).toHaveLength(1);
    expect(m.techniques[0].slug).toBe("scratch");
  });

  it("includes multiple techniques at higher levels", () => {
    const m = Monster.spawn("rockitten", 5);
    expect(m.techniques).toHaveLength(2);
    expect(m.techniques.map((t) => t.slug)).toEqual(["scratch", "ram"]);
  });

  it("starts with full HP", () => {
    const m = Monster.spawn("rockitten", 3);
    expect(m.currentHp).toBe(m.maxHp);
  });

  it("throws for unknown monster slug", () => {
    expect(() => Monster.spawn("unknown", 1)).toThrow("Unknown monster");
  });
});
