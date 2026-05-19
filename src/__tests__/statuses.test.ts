import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Monster } from "../game/model/Monster";
import { TECHNIQUES } from "../game/data/techniques";
import {
  applyStatus,
  clearStatus,
  gatesAction,
  hasStatus,
  meleeMultiplier,
  tickStatuses,
} from "../game/combat/statusHandler";
import { executeTechnique, debugFlags } from "../game/combat/techniqueExecutor";

describe("statusHandler", () => {
  it("applies a status and prevents double-apply", () => {
    const m = Monster.spawn("rockitten", 5);
    expect(applyStatus(m, "poisoned")).toBe("Rockitten was poisoned!");
    expect(applyStatus(m, "poisoned")).toBeNull(); // already has it
    expect(m.status).toHaveLength(1);
  });

  it("ticks poison damage each turn until it wears off", () => {
    const m = Monster.spawn("rockitten", 5);
    applyStatus(m, "poisoned");
    const startHp = m.currentHp;
    const tickDmg = Math.max(1, Math.floor(m.maxHp / 8));

    const t1 = tickStatuses(m);
    expect(t1.some((e) => e.type === "status_tick")).toBe(true);
    expect(m.currentHp).toBe(startHp - tickDmg);

    // Run remaining ticks: status starts at duration 4, one tick consumed.
    tickStatuses(m); // 3 → 2
    tickStatuses(m); // 2 → 1
    const final = tickStatuses(m); // 1 → 0 (wear off)
    expect(final.some((e) => e.type === "status_wear_off")).toBe(true);
    expect(hasStatus(m, "poisoned")).toBe(false);
  });

  it("gatesAction returns the sleep instance and clears nothing on its own", () => {
    const m = Monster.spawn("rockitten", 5);
    applyStatus(m, "sleep");
    const gated = gatesAction(m);
    expect(gated?.slug).toBe("sleep");
    // Status should not auto-clear from gating; only tickStatuses removes it.
    expect(hasStatus(m, "sleep")).toBe(true);
  });

  it("burn halves melee output via meleeMultiplier", () => {
    const m = Monster.spawn("rockitten", 5);
    expect(meleeMultiplier(m)).toBe(1);
    applyStatus(m, "burn");
    expect(meleeMultiplier(m)).toBe(0.5);
  });

  it("clearStatus removes only the named slug", () => {
    const m = Monster.spawn("rockitten", 5);
    applyStatus(m, "poisoned");
    applyStatus(m, "burn");
    clearStatus(m, "poisoned");
    expect(hasStatus(m, "poisoned")).toBe(false);
    expect(hasStatus(m, "burn")).toBe(true);
  });
});

describe("technique executor", () => {
  beforeEach(() => {
    // Force accuracy to succeed deterministically.
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    debugFlags.forceStatusApply = false;
  });

  it("damage effect deducts HP and emits a damage event", () => {
    const att = Monster.spawn("rockitten", 5);
    const def = Monster.spawn("grintot", 5);
    const hp0 = def.currentHp;

    const events = executeTechnique(att, def, TECHNIQUES["ram"], true);
    expect(def.currentHp).toBeLessThan(hp0);
    expect(events.some((e) => e.type === "damage")).toBe(true);
  });

  it("applyStatus effect applies the status when forced", () => {
    debugFlags.forceStatusApply = true;
    const att = Monster.spawn("budaye", 5);
    const def = Monster.spawn("ignibus", 5);

    executeTechnique(att, def, TECHNIQUES["poisonSting"], true);
    expect(hasStatus(def, "poisoned")).toBe(true);
  });

  it("lullaby applies sleep with no damage", () => {
    debugFlags.forceStatusApply = true;
    const att = Monster.spawn("budaye", 5);
    const def = Monster.spawn("ignibus", 5);
    const hp0 = def.currentHp;

    executeTechnique(att, def, TECHNIQUES["lullaby"], true);
    expect(hasStatus(def, "sleep")).toBe(true);
    expect(def.currentHp).toBe(hp0);
  });
});
