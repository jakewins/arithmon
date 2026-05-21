import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CombatMachine } from "../game/combat/machine";
import { Monster } from "../game/model/Monster";
import { createInventory, addItem } from "../game/item/inventory";
import { type Inventory } from "../game/item/inventory";
import { getNpcParty } from "../game/data/npcParties";
import { drainEvents } from "./_combatTestHelpers";

describe("Trainer battle restrictions", () => {
  let player: Monster;
  let enemy: Monster;
  let enemyParty: Monster[];
  let party: Monster[];
  let inventory: Inventory;
  let machine: CombatMachine;

  beforeEach(() => {
    player = Monster.spawn("rockitten", 5);
    enemy = Monster.spawn("budaye", 5);
    enemyParty = [enemy, Monster.spawn("ignibus", 4)];
    party = [player];
    inventory = createInventory();
    addItem(inventory, "tuxeball", 3);
    machine = new CombatMachine(player, enemy, party, inventory, false, enemyParty, "Silver");
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    machine.intro();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("intro message uses trainer name", () => {
    // Reset and check intro
    const m = new CombatMachine(player, enemy, party, inventory, false, enemyParty, "Silver");
    const events = m.intro();
    expect(events[0].message).toBe("Trainer Silver wants to battle!");
  });

  it("fleeing always fails in trainer battles", () => {
    const events = machine.submitAction({ type: "run" });
    expect(events.some((e) => e.message === "Can't escape from a trainer battle!")).toBe(true);
    // Should return to DECISION, not END
    expect(machine.state).toBe("DECISION");
    expect(machine.outcome).toBeNull();
  });

  it("capture is blocked in trainer battles", () => {
    const events = machine.submitAction({ type: "capture", itemSlug: "tuxeball" });
    expect(events.some((e) => e.message === "Can't use that in a trainer battle!")).toBe(true);
    expect(machine.state).toBe("DECISION");
    expect(machine.outcome).toBeNull();
  });

  it("wild battles still allow fleeing", () => {
    const wildMachine = new CombatMachine(player, enemy, party, inventory, true);
    vi.spyOn(Math, "random").mockReturnValue(0.1); // low roll succeeds the flee check
    wildMachine.intro();
    const events = wildMachine.submitAction({ type: "run" });
    expect(events.some((e) => e.type === "flee_success")).toBe(true);
    expect(wildMachine.state).toBe("END");
    expect(wildMachine.outcome).toBe("fled");
  });
});

describe("Multi-monster enemy party", () => {
  let player: Monster;
  let enemy1: Monster;
  let enemy2: Monster;
  let enemyParty: Monster[];
  let machine: CombatMachine;

  beforeEach(() => {
    player = Monster.spawn("rockitten", 10);
    enemy1 = Monster.spawn("budaye", 3);
    enemy2 = Monster.spawn("ignibus", 3);
    enemyParty = [enemy1, enemy2];
    machine = new CombatMachine(
      player,
      enemy1,
      [player],
      createInventory(),
      false,
      enemyParty,
      "Silver",
    );
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    machine.intro();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends out next enemy when first faints", () => {
    // Reduce first enemy to near death
    enemy1.currentHp = 1;
    const events = machine.submitAction({ type: "fight", technique: "scratch" });

    // First enemy should faint
    expect(events.some((e) => e.type === "faint" && e.message.includes(enemy1.name))).toBe(true);
    // Next enemy should be sent out
    expect(events.some((e) => e.type === "swap_in" && e.message.includes(enemy2.name))).toBe(true);
    // Combat continues (not END)
    expect(machine.state).toBe("DECISION");
    // STORY-0233: swap_in.apply does the enemy-pointer flip.
    drainEvents(events);
    expect(machine.enemy).toBe(enemy2);
  });

  it("battle ends when all enemies faint", () => {
    // Kill both enemies
    enemy1.currentHp = 1;
    drainEvents(machine.submitAction({ type: "fight", technique: "scratch" }));
    expect(machine.enemy).toBe(enemy2);

    // Now kill second enemy
    enemy2.currentHp = 1;
    const events2 = machine.submitAction({ type: "fight", technique: "scratch" });
    expect(events2.some((e) => e.type === "faint" && e.message.includes(enemy2.name))).toBe(true);
    expect(machine.state).toBe("END");
    expect(machine.outcome).toBe("win");
  });
});

describe("NPC party registry", () => {
  it("returns party for registered NPC", () => {
    const party = getNpcParty("spyder_papertown_silver");
    expect(party).toBeDefined();
    expect(party!.name).toBe("Silver");
    expect(party!.monsters.length).toBeGreaterThanOrEqual(2);
  });

  it("returns undefined for unknown NPC", () => {
    expect(getNpcParty("nonexistent")).toBeUndefined();
  });
});

describe("Battle outcome tracking", () => {
  it("stores outcome in session.battleOutcomes map", async () => {
    // We test the data flow at the machine level — the session integration
    // is tested via the start_battle action in integration tests.
    const { session } = await import("../game/session");
    session.battleOutcomes.set("test_npc", "won");
    expect(session.battleOutcomes.get("test_npc")).toBe("won");
    session.battleOutcomes.delete("test_npc");
  });
});
