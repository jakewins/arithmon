import { describe, it, expect, vi } from "vitest";
import { calculateDamage, rollAccuracy, rollFleeChance } from "../game/combat/formula";
import { Monster } from "../game/model/Monster";
import { TECHNIQUES } from "../game/data/techniques";

describe("calculateDamage", () => {
  it("computes damage using the formula", () => {
    const attacker = Monster.spawn("rockitten", 5);
    const defender = Monster.spawn("rockitten", 5);
    const technique = TECHNIQUES["ram"]; // power 1.5, normal vs earth = 1x

    // floor((7 + 5) * 72 * 1.5 / 72) = floor(12 * 1.5) = floor(18) = 18
    expect(calculateDamage(attacker, technique, defender)).toEqual({
      damage: 18,
      effectiveness: 1,
    });
  });

  it("returns higher damage at higher levels", () => {
    const low = Monster.spawn("rockitten", 2);
    const high = Monster.spawn("rockitten", 10);
    const tech = TECHNIQUES["ram"];

    const lowDmg = calculateDamage(low, tech, low).damage;
    const highDmg = calculateDamage(high, tech, high).damage;
    expect(highDmg).toBeGreaterThan(lowDmg);
  });

  it("applies element effectiveness multipliers", () => {
    const ignibus = Monster.spawn("ignibus", 5);
    const budaye = Monster.spawn("budaye", 5); // wood
    const grintot = Monster.spawn("grintot", 5); // earth
    const ember = TECHNIQUES["ember"]; // fire

    const vsWood = calculateDamage(ignibus, ember, budaye);
    const vsEarth = calculateDamage(ignibus, ember, grintot);

    expect(vsWood.effectiveness).toBe(2);
    expect(vsEarth.effectiveness).toBe(0.5);
    // 2x vs 0.5x = 4x ratio (within flooring noise)
    expect(vsWood.damage).toBeGreaterThan(vsEarth.damage * 3);
  });
});

describe("rollAccuracy", () => {
  it("returns true when random is below accuracy", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(rollAccuracy(0.85)).toBe(true);
    vi.restoreAllMocks();
  });

  it("returns false when random is above accuracy", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    expect(rollAccuracy(0.85)).toBe(false);
    vi.restoreAllMocks();
  });
});

describe("rollFleeChance", () => {
  it("succeeds when random is below flee chance", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3);
    // chance = 0.4 + 0.15 * (1 + 5 - 5) = 0.4 + 0.15 = 0.55
    expect(rollFleeChance(1, 5, 5)).toBe(true);
    vi.restoreAllMocks();
  });

  it("fails when random is above flee chance", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.8);
    // chance = 0.4 + 0.15 * (0 + 5 - 5) = 0.4
    expect(rollFleeChance(0, 5, 5)).toBe(false);
    vi.restoreAllMocks();
  });

  it("caps flee chance at 0.95", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.94);
    // chance = 0.4 + 0.15 * (10 + 20 - 1) = 0.4 + 4.35 = 4.75, capped at 0.95
    expect(rollFleeChance(10, 20, 1)).toBe(true);
    vi.restoreAllMocks();
  });
});
