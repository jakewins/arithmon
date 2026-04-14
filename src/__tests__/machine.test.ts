import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CombatMachine } from "../game/combat/machine";
import { Monster } from "../game/model/Monster";

describe("CombatMachine", () => {
  let player: Monster;
  let enemy: Monster;
  let machine: CombatMachine;

  beforeEach(() => {
    player = Monster.spawn("rockitten", 5);
    enemy = Monster.spawn("rockitten", 5);
    machine = new CombatMachine(player, enemy);
    // Make all attacks hit
    vi.spyOn(Math, "random").mockReturnValue(0.1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in INTRO state", () => {
    expect(machine.state).toBe("INTRO");
  });

  it("intro transitions to DECISION and emits intro event", () => {
    const events = machine.intro();
    expect(machine.state).toBe("DECISION");
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("intro");
    expect(events[0].message).toContain("Rockitten");
  });

  it("fight deals damage to both sides and returns to DECISION", () => {
    machine.intro();
    const events = machine.submitAction("fight");

    expect(events.some((e) => e.type === "player_attack")).toBe(true);
    expect(events.some((e) => e.type === "enemy_attack")).toBe(true);
    expect(enemy.currentHp).toBeLessThan(enemy.maxHp);
    expect(player.currentHp).toBeLessThan(player.maxHp);
    expect(machine.state).toBe("DECISION");
  });

  it("combat ends with win when enemy HP reaches 0", () => {
    machine.intro();

    // Keep fighting until combat ends
    while (machine.state === "DECISION") {
      machine.submitAction("fight");
    }

    // With equal stats and both always hitting, one will faint
    expect(machine.state).toBe("END");
    expect(machine.outcome).not.toBeNull();
  });

  it("player attacks first — so with equal stats, player wins", () => {
    machine.intro();
    while (machine.state === "DECISION") {
      machine.submitAction("fight");
    }
    // Player attacks first each turn, so with equal stats player wins
    expect(machine.outcome).toBe("win");
  });

  it("flee succeeds when roll passes", () => {
    machine.intro();
    // random returns 0.1, flee chance at attempt 1 = 0.4 + 0.15*(1+0) = 0.55 > 0.1
    const events = machine.submitAction("run");
    expect(events.some((e) => e.type === "flee_success")).toBe(true);
    expect(machine.state).toBe("END");
    expect(machine.outcome).toBe("fled");
  });

  it("flee fails when roll does not pass", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    machine.intro();
    const events = machine.submitAction("run");
    expect(events.some((e) => e.type === "flee_fail")).toBe(true);
    // Enemy still attacks after failed flee
    expect(events.some((e) => e.type === "enemy_attack")).toBe(true);
    expect(machine.state).toBe("DECISION");
  });

  it("ignores actions when not in DECISION state", () => {
    // Still in INTRO state
    const events = machine.submitAction("fight");
    expect(events).toHaveLength(0);
  });
});
