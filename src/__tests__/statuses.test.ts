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

    // STORY-0233: tickStatuses returns events with deferred apply closures.
    // Helper that drains each batch the way the combat machine does.
    const runTick = () => {
      const evs = tickStatuses(m);
      for (const e of evs) e.apply();
      return evs;
    };

    const t1 = runTick();
    expect(t1.some((e) => e.type === "status_tick")).toBe(true);
    expect(m.currentHp).toBe(startHp - tickDmg);

    // Run remaining ticks: status starts at duration 4, one tick consumed.
    runTick(); // 3 → 2
    runTick(); // 2 → 1
    const final = runTick(); // 1 → 0 (wear off)
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
    expect(events.some((e) => e.type === "damage")).toBe(true);
    // STORY-0233: executor returns events whose `apply` closures perform
    // the model mutation. Drain to land them on the live model.
    for (const e of events) e.apply?.();
    expect(def.currentHp).toBeLessThan(hp0);
  });

  it("applyStatus effect applies the status when forced", () => {
    debugFlags.forceStatusApply = true;
    const att = Monster.spawn("budaye", 5);
    const def = Monster.spawn("ignibus", 5);

    const events = executeTechnique(att, def, TECHNIQUES["poisonSting"], true);
    for (const e of events) e.apply?.();
    expect(hasStatus(def, "poisoned")).toBe(true);
  });

  it("lullaby applies sleep with no damage", () => {
    debugFlags.forceStatusApply = true;
    const att = Monster.spawn("budaye", 5);
    const def = Monster.spawn("ignibus", 5);
    const hp0 = def.currentHp;

    const events = executeTechnique(att, def, TECHNIQUES["lullaby"], true);
    for (const e of events) e.apply?.();
    expect(hasStatus(def, "sleep")).toBe(true);
    expect(def.currentHp).toBe(hp0);
  });
});
