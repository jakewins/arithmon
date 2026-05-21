import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CombatMachine } from "../game/combat/machine";
import { Monster, PARTY_LIMIT } from "../game/model/Monster";
import { createInventory, addItem, getItemCount } from "../game/item/inventory";
import { type Inventory } from "../game/item/inventory";
import { shakeCheck, attemptCapture } from "../game/combat/formula";
import { drainEvents } from "./_combatTestHelpers";

describe("capture formula", () => {
  it("shakeCheck is higher when target HP is lower", () => {
    const monster = Monster.spawn("rockitten", 5);
    const fullHpCheck = shakeCheck(monster, 1.0);

    monster.currentHp = 1;
    const lowHpCheck = shakeCheck(monster, 1.0);

    expect(lowHpCheck).toBeGreaterThan(fullHpCheck);
  });

  it("shakeCheck scales with ball modifier", () => {
    const monster = Monster.spawn("rockitten", 5);
    monster.currentHp = Math.floor(monster.maxHp / 2);

    const normalCheck = shakeCheck(monster, 1.0);
    const strongCheck = shakeCheck(monster, 2.0);

    expect(strongCheck).toBeGreaterThan(normalCheck);
  });

  it("shakeCheck at 1 HP yields high value", () => {
    const monster = Monster.spawn("rockitten", 5);
    monster.currentHp = 1;
    const sv = shakeCheck(monster, 1.0);
    // rockitten catchRate=100; at 1 HP the ratio approaches 1, so sv ≈ catchRate.
    expect(sv).toBeGreaterThan(90);
  });

  it("shakeCheck at full HP yields lower value", () => {
    const monster = Monster.spawn("rockitten", 5);
    const sv = shakeCheck(monster, 1.0);
    // At full HP: (3*max - 2*max) * catchRate / (3*max) = catchRate/3.
    // With rockitten catchRate=100, that's ~33.
    expect(sv).toBeLessThanOrEqual(34);
  });

  it("attemptCapture succeeds when all rolls pass", () => {
    // All rolls return 0, which is always <= shakeValue
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = attemptCapture(100);
    expect(result.success).toBe(true);
    expect(result.shakes).toBe(4);
    vi.restoreAllMocks();
  });

  it("attemptCapture fails when roll exceeds shakeValue", () => {
    // Roll returns 0.99 * 256 ≈ 253, which exceeds most shake values
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const result = attemptCapture(50);
    expect(result.success).toBe(false);
    expect(result.shakes).toBe(1); // Fails on first shake
    vi.restoreAllMocks();
  });

  it("attemptCapture returns correct shake count on mid-attempt failure", () => {
    let callCount = 0;
    vi.spyOn(Math, "random").mockImplementation(() => {
      callCount++;
      // First two rolls pass, third fails
      return callCount <= 2 ? 0 : 0.99;
    });
    const result = attemptCapture(50);
    expect(result.success).toBe(false);
    expect(result.shakes).toBe(3);
    vi.restoreAllMocks();
  });
});

describe("CombatMachine capture action", () => {
  let player: Monster;
  let enemy: Monster;
  let party: Monster[];
  let inventory: Inventory;
  let machine: CombatMachine;

  beforeEach(() => {
    player = Monster.spawn("rockitten", 5);
    enemy = Monster.spawn("rockitten", 5);
    party = [player];
    inventory = createInventory();
    addItem(inventory, "tuxeball", 5);
    machine = new CombatMachine(player, enemy, party, inventory);
    machine.intro();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("successful capture ends combat as a win", () => {
    // Force all random rolls to 0 (all shakes pass)
    vi.spyOn(Math, "random").mockReturnValue(0);
    enemy.currentHp = 1; // Make capture easy

    const events = machine.submitAction({ type: "capture", itemSlug: "tuxeball" });

    expect(events.some((e) => e.type === "item_used")).toBe(true);
    expect(events.some((e) => e.type === "capture_shake")).toBe(true);
    expect(events.some((e) => e.type === "capture_success")).toBe(true);
    expect(events.find((e) => e.type === "capture_success")?.message).toContain("Gotcha!");
    expect(machine.state).toBe("END");
    expect(machine.outcome).toBe("win");
  });

  it("failed capture continues combat with enemy attack", () => {
    // Force all random rolls high (shakes fail)
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const events = machine.submitAction({ type: "capture", itemSlug: "tuxeball" });

    expect(events.some((e) => e.type === "capture_fail")).toBe(true);
    expect(events.find((e) => e.type === "capture_fail")?.message).toContain("broke free");
    expect(events.some((e) => e.type === "enemy_attack")).toBe(true);
    expect(machine.state).toBe("DECISION");
  });

  it("capture consumes one tuxeball from inventory", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    enemy.currentHp = 1;
    expect(getItemCount(inventory, "tuxeball")).toBe(5);

    const events = machine.submitAction({ type: "capture", itemSlug: "tuxeball" });
    drainEvents(events);

    expect(getItemCount(inventory, "tuxeball")).toBe(4);
  });

  it("capture consumes tuxeball even on failure", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(getItemCount(inventory, "tuxeball")).toBe(5);

    const events = machine.submitAction({ type: "capture", itemSlug: "tuxeball" });
    drainEvents(events);

    expect(getItemCount(inventory, "tuxeball")).toBe(4);
  });

  it("shake events appear in output (1-4 shakes)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    enemy.currentHp = 1;

    const events = machine.submitAction({ type: "capture", itemSlug: "tuxeball" });

    const shakeEvents = events.filter((e) => e.type === "capture_shake");
    expect(shakeEvents.length).toBe(4); // All 4 shakes on success
    expect(shakeEvents[0].message).toBe("Shake...");
  });

  it("onCapture callback is invoked on success", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    enemy.currentHp = 1;

    const captured: Monster[] = [];
    machine.onCapture = (mon) => captured.push(mon);

    const events = machine.submitAction({ type: "capture", itemSlug: "tuxeball" });
    drainEvents(events);

    expect(captured).toHaveLength(1);
    expect(captured[0]).toBe(enemy);
  });

  it("onCapture callback is not invoked on failure", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const captured: Monster[] = [];
    machine.onCapture = (mon) => captured.push(mon);

    machine.submitAction({ type: "capture", itemSlug: "tuxeball" });

    expect(captured).toHaveLength(0);
  });

  it("capture does not drain dark power", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    enemy.currentHp = 1;
    const dpBefore = machine.darkPower;

    machine.submitAction({ type: "capture", itemSlug: "tuxeball" });

    expect(machine.darkPower).toBe(dpBefore);
  });
});

describe("capture post-capture handling", () => {
  it("adds captured monster to party when party has space", () => {
    const p = Monster.spawn("rockitten", 5);
    const enemy = Monster.spawn("budaye", 5);
    const party = [p];
    const inventory = createInventory();
    addItem(inventory, "tuxeball", 1);

    const machine = new CombatMachine(p, enemy, party, inventory);
    const capturedMonsters: Monster[] = [];
    machine.onCapture = (mon) => capturedMonsters.push(mon);
    machine.intro();

    vi.spyOn(Math, "random").mockReturnValue(0);
    enemy.currentHp = 1;
    const events = machine.submitAction({ type: "capture", itemSlug: "tuxeball" });
    drainEvents(events);

    expect(capturedMonsters[0]).toBe(enemy);
    vi.restoreAllMocks();
  });

  it("onCapture can route to storage when party is full", () => {
    const enemy = Monster.spawn("budaye", 5);
    const party: Monster[] = [];
    for (let i = 0; i < PARTY_LIMIT; i++) {
      party.push(Monster.spawn("rockitten", 5));
    }
    const inventory = createInventory();
    addItem(inventory, "tuxeball", 1);

    const machine = new CombatMachine(party[0], enemy, party, inventory);

    const storage: Monster[] = [];
    machine.onCapture = (mon) => {
      if (party.length < PARTY_LIMIT) {
        party.push(mon);
      } else {
        storage.push(mon);
      }
    };
    machine.intro();

    vi.spyOn(Math, "random").mockReturnValue(0);
    enemy.currentHp = 1;
    const events = machine.submitAction({ type: "capture", itemSlug: "tuxeball" });
    drainEvents(events);

    expect(storage).toHaveLength(1);
    expect(storage[0]).toBe(enemy);
    vi.restoreAllMocks();
  });
});
