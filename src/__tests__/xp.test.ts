import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Monster } from "../game/model/Monster";
import { xpForLevel, calculateXpReward } from "../game/combat/formula";
import { CombatMachine } from "../game/combat/machine";
import { createInventory, addItem } from "../game/item/inventory";

describe("xpForLevel", () => {
  it("returns 0 for level 0", () => {
    expect(xpForLevel(0)).toBe(0);
  });

  it("returns 1 for level 1", () => {
    expect(xpForLevel(1)).toBe(1);
  });

  it("returns level cubed", () => {
    expect(xpForLevel(5)).toBe(125);
    expect(xpForLevel(10)).toBe(1000);
  });
});

describe("calculateXpReward", () => {
  it("calculates XP from defeated monster level and base yield", () => {
    // baseXpYield=50, level=5 → floor(50*5/5) = 50
    expect(calculateXpReward(5, 50)).toBe(50);
  });

  it("scales with level", () => {
    expect(calculateXpReward(10, 50)).toBe(100);
  });
});

describe("Monster XP system", () => {
  it("spawns with totalXp equal to xpForLevel(level)", () => {
    const m = Monster.spawn("rockitten", 5);
    expect(m.totalXp).toBe(xpForLevel(5));
    expect(m.totalXp).toBe(125);
  });

  it("xpProgress starts at 0 for a freshly spawned monster", () => {
    const m = Monster.spawn("rockitten", 5);
    expect(m.xpProgress).toBe(0);
  });

  it("xpProgress increases as XP is added", () => {
    const m = Monster.spawn("rockitten", 5);
    const range = xpForLevel(6) - xpForLevel(5); // 216 - 125 = 91
    m.addXp(Math.floor(range / 2));
    expect(m.xpProgress).toBeGreaterThan(0.4);
    expect(m.xpProgress).toBeLessThan(0.6);
  });

  it("levels up when XP crosses the threshold", () => {
    const m = Monster.spawn("rockitten", 5);
    const xpNeeded = xpForLevel(6) - xpForLevel(5); // 91
    const results = m.addXp(xpNeeded);
    expect(m.level).toBe(6);
    expect(results).toHaveLength(1);
    expect(results[0].newLevel).toBe(6);
  });

  it("recalculates stats on level-up", () => {
    const m = Monster.spawn("rockitten", 5);
    const oldMaxHp = m.maxHp; // 8 * 12 = 96
    const xpNeeded = xpForLevel(6) - xpForLevel(5);
    m.addXp(xpNeeded);
    // New maxHp = 8 * (6 + 7) = 104
    expect(m.maxHp).toBe(8 * 13);
    expect(m.maxHp).toBeGreaterThan(oldMaxHp);
  });

  it("heals the HP difference on level-up", () => {
    const m = Monster.spawn("rockitten", 5);
    m.currentHp = 50; // damaged
    const oldMaxHp = m.maxHp;
    const xpNeeded = xpForLevel(6) - xpForLevel(5);
    m.addXp(xpNeeded);
    const hpGain = m.maxHp - oldMaxHp;
    expect(m.currentHp).toBe(50 + hpGain);
  });

  it("learns new moves at the appropriate level", () => {
    // Rockitten learns pounce at level 6
    const m = Monster.spawn("rockitten", 5);
    expect(m.techniques.map((t) => t.slug)).toEqual(["scratch", "ram"]);
    const xpNeeded = xpForLevel(6) - xpForLevel(5);
    const results = m.addXp(xpNeeded);
    expect(m.techniques.map((t) => t.slug)).toEqual(["scratch", "ram", "pounce"]);
    expect(results[0].newMoves).toHaveLength(1);
    expect(results[0].newMoves[0].slug).toBe("pounce");
  });

  it("handles multiple level-ups at once", () => {
    const m = Monster.spawn("rockitten", 1);
    const xpNeeded = xpForLevel(5) - xpForLevel(1); // 125 - 1 = 124
    const results = m.addXp(xpNeeded);
    expect(m.level).toBe(5);
    expect(results).toHaveLength(4); // levels 2, 3, 4, 5
  });

  it("learns ram at level 3 during multi-level jump", () => {
    const m = Monster.spawn("rockitten", 1);
    expect(m.techniques).toHaveLength(1);
    const xpNeeded = xpForLevel(5) - xpForLevel(1);
    m.addXp(xpNeeded);
    expect(m.techniques.map((t) => t.slug)).toEqual(["scratch", "ram"]);
  });

  it("xpToNextLevel returns xp for next level", () => {
    const m = Monster.spawn("rockitten", 5);
    expect(m.xpToNextLevel).toBe(xpForLevel(6));
  });
});

describe("CombatMachine XP award", () => {
  let player: Monster;
  let enemy: Monster;
  let machine: CombatMachine;

  beforeEach(() => {
    player = Monster.spawn("rockitten", 5);
    enemy = Monster.spawn("budaye", 5);
    machine = new CombatMachine(player, enemy);
    vi.spyOn(Math, "random").mockReturnValue(0.1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("awards XP when enemy faints", () => {
    machine.intro();
    const startXp = player.totalXp;

    while (machine.state === "DECISION") {
      machine.submitAction({ type: "fight", technique: "scratch" });
    }

    expect(machine.outcome).toBe("win");
    expect(player.totalXp).toBeGreaterThan(startXp);
  });

  it("emits xp_gain event on win", () => {
    machine.intro();

    let events: ReturnType<typeof machine.submitAction> = [];
    while (machine.state === "DECISION") {
      events = machine.submitAction({ type: "fight", technique: "scratch" });
    }

    expect(events.some((e) => e.type === "xp_gain")).toBe(true);
    const xpEvent = events.find((e) => e.type === "xp_gain")!;
    expect(xpEvent.message).toContain("XP");
  });

  it("does not award XP on flee", () => {
    machine.intro();
    const startXp = player.totalXp;
    machine.submitAction({ type: "run" });
    expect(machine.outcome).toBe("fled");
    expect(player.totalXp).toBe(startXp);
  });
});

describe("XP awarded on capture", () => {
  let player: Monster;
  let enemy: Monster;
  let machine: CombatMachine;

  beforeEach(() => {
    player = Monster.spawn("rockitten", 5);
    enemy = Monster.spawn("pairagrin", 3);
    const inventory = createInventory();
    addItem(inventory, "tuxeball", 5);
    machine = new CombatMachine(player, enemy, [player], inventory);
    vi.spyOn(Math, "random").mockReturnValue(0);
    machine.intro();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("awards XP when a wild monster is captured", () => {
    const startXp = player.totalXp;
    enemy.currentHp = 1;

    const events = machine.submitAction({ type: "capture", itemSlug: "tuxeball" });

    expect(machine.outcome).toBe("win");
    expect(player.totalXp).toBeGreaterThan(startXp);
    expect(events.some((e) => e.type === "xp_gain")).toBe(true);
  });

  it("does not award XP when capture fails", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const startXp = player.totalXp;

    machine.submitAction({ type: "capture", itemSlug: "tuxeball" });

    expect(machine.state).toBe("DECISION");
    expect(player.totalXp).toBe(startXp);
  });
});
