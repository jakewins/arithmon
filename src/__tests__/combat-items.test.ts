import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CombatMachine } from "../game/combat/machine";
import { Monster } from "../game/model/Monster";
import { createInventory, addItem, getItemCount } from "../game/item/inventory";
import { type Inventory } from "../game/item/inventory";

describe("CombatMachine item usage", () => {
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
    addItem(inventory, "potion", 3);
    addItem(inventory, "revive", 1);
    machine = new CombatMachine(player, enemy, party, inventory);
    // Make all attacks hit
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    machine.intro();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("using a potion heals the target monster", () => {
    // Heal a non-active party member so enemy counter-attack doesn't affect them
    const ally = Monster.spawn("rockitten", 5);
    ally.currentHp = 20;
    party.push(ally);

    const events = machine.submitAction({ type: "item", itemSlug: "potion", targetIndex: 1 });

    expect(events.some((e) => e.type === "item_used")).toBe(true);
    expect(events.some((e) => e.type === "item_heal")).toBe(true);
    expect(ally.currentHp).toBe(40);
  });

  it("healing is capped at maxHp", () => {
    // Use a party member that won't be hit by enemy attack
    const ally = Monster.spawn("rockitten", 5);
    ally.currentHp = ally.maxHp - 5;
    party.push(ally);

    machine.submitAction({ type: "item", itemSlug: "potion", targetIndex: 1 });

    expect(ally.currentHp).toBe(ally.maxHp);
  });

  it("using an item consumes one from inventory", () => {
    player.currentHp = 20;
    expect(getItemCount(inventory, "potion")).toBe(3);

    machine.submitAction({ type: "item", itemSlug: "potion", targetIndex: 0 });

    expect(getItemCount(inventory, "potion")).toBe(2);
  });

  it("using an item costs a turn (enemy attacks after)", () => {
    player.currentHp = 20;
    const events = machine.submitAction({ type: "item", itemSlug: "potion", targetIndex: 0 });

    expect(events.some((e) => e.type === "enemy_attack")).toBe(true);
    expect(machine.state).toBe("DECISION");
  });

  it("revive restores a fainted monster", () => {
    const ally = Monster.spawn("rockitten", 5);
    ally.currentHp = 0;
    party.push(ally);

    const events = machine.submitAction({ type: "item", itemSlug: "revive", targetIndex: 1 });

    expect(events.some((e) => e.type === "item_revive")).toBe(true);
    expect(ally.currentHp).toBeGreaterThan(0);
    expect(ally.currentHp).toBe(Math.floor(ally.maxHp * 0.5));
    expect(getItemCount(inventory, "revive")).toBe(0);
  });

  it("item action does not drain dark power", () => {
    player.currentHp = 20;
    const dpBefore = machine.darkPower;

    machine.submitAction({ type: "item", itemSlug: "potion", targetIndex: 0 });

    expect(machine.darkPower).toBe(dpBefore);
  });

  it("displays item name in used message", () => {
    player.currentHp = 20;
    const events = machine.submitAction({ type: "item", itemSlug: "potion", targetIndex: 0 });

    const usedEvent = events.find((e) => e.type === "item_used");
    expect(usedEvent?.message).toBe("Used Potion!");
  });

  it("displays heal amount in heal message", () => {
    player.currentHp = 20;
    const events = machine.submitAction({ type: "item", itemSlug: "potion", targetIndex: 0 });

    const healEvent = events.find((e) => e.type === "item_heal");
    expect(healEvent?.message).toContain("20 HP");
  });
});
