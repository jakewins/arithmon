import { describe, it, expect, vi } from "vitest";
import { calculateDamage, rollAccuracy, rollFleeChance } from "../game/combat/formula";
import { Monster } from "../game/model/Monster";
import { TECHNIQUES } from "../game/data/techniques";

describe("calculateDamage", () => {
  it("computes damage using the formula", () => {
    // rockitten (hunter): melee 8, ranged 4, armor 4, dodge 8 — scaled by lvl+7 = 12
    // ram is melee, power 1.5, normal element. normal vs earth = 1x.
    // floor((7 + 5) * (8*12) * 1.5 / (4*12)) = floor(12 * 96 * 1.5 / 48) = floor(36) = 36
    const attacker = Monster.spawn("rockitten", 5);
    const defender = Monster.spawn("rockitten", 5);
    const technique = TECHNIQUES["ram"];

    expect(calculateDamage(attacker, technique, defender)).toEqual({
      damage: 36,
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
    const ember = TECHNIQUES["ember"]; // fire, ranged

    const vsWood = calculateDamage(ignibus, ember, budaye);
    const vsEarth = calculateDamage(ignibus, ember, grintot);

    expect(vsWood.effectiveness).toBe(2);
    expect(vsEarth.effectiveness).toBe(0.5);
    // 2x vs 0.5x = ~4x ratio (within flooring noise)
    expect(vsWood.damage).toBeGreaterThan(vsEarth.damage * 3);
  });

  it("melee techniques use attacker.melee vs defender.armor", () => {
    const att = Monster.spawn("rockitten", 5); // hunter: melee 96, ranged 48
    const def = Monster.spawn("grintot", 5); // brute: armor 84, dodge 60
    const ram = TECHNIQUES["ram"]; // melee, power 1.5, normal element vs earth = 1x

    // floor((7+5) * 96 * 1.5 / 84) = floor(20.57) = 20
    expect(calculateDamage(att, ram, def).damage).toBe(20);
  });

  it("ranged techniques use attacker.ranged vs defender.dodge", () => {
    const att = Monster.spawn("ignibus", 5); // polliwog: melee 48, ranged 96
    const def = Monster.spawn("grintot", 5); // brute: armor 84, dodge 60
    const psybeam = TECHNIQUES["psybeam"]; // ranged, power 1.8, cosmic vs earth = 1x

    // floor((7+5) * 96 * 1.8 / 60) = floor(34.56) = 34
    expect(calculateDamage(att, psybeam, def).damage).toBe(34);
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
