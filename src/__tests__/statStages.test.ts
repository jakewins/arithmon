import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Monster } from "../game/model/Monster";
import { TECHNIQUES } from "../game/data/techniques";
import {
  adjustStage,
  effectiveStat,
  stageMultiplier,
  STAT_STAGE_MAX,
  STAT_STAGE_MIN,
} from "../game/combat/statStages";
import { calculateDamage } from "../game/combat/formula";
import { executeTechnique } from "../game/combat/techniqueExecutor";

describe("stageMultiplier table", () => {
  it("matches the Gen II+ canonical values", () => {
    expect(stageMultiplier(0)).toBe(1);
    expect(stageMultiplier(1)).toBe(3 / 2);
    expect(stageMultiplier(2)).toBe(4 / 2);
    expect(stageMultiplier(6)).toBe(8 / 2);
    expect(stageMultiplier(-1)).toBe(2 / 3);
    expect(stageMultiplier(-2)).toBe(2 / 4);
    expect(stageMultiplier(-6)).toBe(2 / 8);
  });

  it("clamps out-of-range stages to the boundary multipliers", () => {
    expect(stageMultiplier(99)).toBe(stageMultiplier(STAT_STAGE_MAX));
    expect(stageMultiplier(-99)).toBe(stageMultiplier(STAT_STAGE_MIN));
  });
});

describe("adjustStage", () => {
  it("reports clamping at the bounds", () => {
    expect(adjustStage(5, 3)).toEqual({ oldStage: 5, newStage: 6, clamped: true });
    expect(adjustStage(-5, -3)).toEqual({ oldStage: -5, newStage: -6, clamped: true });
    expect(adjustStage(0, 1)).toEqual({ oldStage: 0, newStage: 1, clamped: false });
  });
});

describe("calculateDamage with stat stages", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("halves damage when defender's armor stage is +2", () => {
    const att = Monster.spawn("rockitten", 5);
    const def = Monster.spawn("rockitten", 5);
    const ram = TECHNIQUES["ram"];

    const baseline = calculateDamage(att, ram, def, 1.5).damage;
    def.statStages.armor = 2; // armor *= 4/2 = 2x → damage halves
    const buffed = calculateDamage(att, ram, def, 1.5).damage;
    expect(buffed).toBeLessThan(baseline);
    // 2x defender armor → ~half damage (allow off-by-1 from flooring)
    expect(buffed).toBeGreaterThanOrEqual(Math.floor(baseline / 2) - 1);
    expect(buffed).toBeLessThanOrEqual(Math.floor(baseline / 2) + 1);
  });

  it("halves damage when attacker's melee stage is -2", () => {
    const att = Monster.spawn("rockitten", 5);
    const def = Monster.spawn("rockitten", 5);
    const ram = TECHNIQUES["ram"];

    const baseline = calculateDamage(att, ram, def, 1.5).damage;
    att.statStages.melee = -2; // melee *= 2/4 = 0.5x
    const debuffed = calculateDamage(att, ram, def, 1.5).damage;
    expect(debuffed).toBeLessThan(baseline);
    expect(debuffed).toBeGreaterThanOrEqual(Math.floor(baseline / 2) - 1);
  });
});

describe("statStage technique effect", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("growl drops opponent melee by one stage", () => {
    const att = Monster.spawn("rockitten", 5);
    const def = Monster.spawn("rockitten", 5);
    expect(def.statStages.melee).toBe(0);

    const events = executeTechnique(att, def, TECHNIQUES["growl"], true);
    expect(def.statStages.melee).toBe(-1);
    expect(events.some((e) => e.type === "stat_stage" && /fell/.test(e.message))).toBe(true);
  });

  it("harden buffs self armor by one stage", () => {
    const att = Monster.spawn("rockitten", 5);
    const def = Monster.spawn("rockitten", 5);
    executeTechnique(att, def, TECHNIQUES["harden"], true);
    expect(att.statStages.armor).toBe(1);
  });

  it("reports the clamp message when at the boundary", () => {
    const att = Monster.spawn("rockitten", 5);
    const def = Monster.spawn("rockitten", 5);
    def.statStages.melee = -6;
    const events = executeTechnique(att, def, TECHNIQUES["growl"], true);
    expect(def.statStages.melee).toBe(-6);
    expect(events.some((e) => e.type === "stat_stage" && /can't go/.test(e.message))).toBe(true);
  });
});

describe("effectiveStat", () => {
  it("scales the base stat by the stage multiplier", () => {
    expect(effectiveStat(100, 0)).toBe(100);
    expect(effectiveStat(100, 1)).toBe(150);
    expect(effectiveStat(100, -2)).toBe(50);
  });
});
