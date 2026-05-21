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
    const technique = player.techniques[0];
    const events = machine.submitAction({ type: "fight", technique: technique.slug });

    expect(events.some((e) => e.type === "player_attack")).toBe(true);
    expect(events.some((e) => e.type === "enemy_attack")).toBe(true);
    expect(enemy.currentHp).toBeLessThan(enemy.maxHp);
    expect(player.currentHp).toBeLessThan(player.maxHp);
    expect(machine.state).toBe("DECISION");
  });

  it("combat ends with win when enemy HP reaches 0", () => {
    machine.intro();
    const technique = player.techniques[0];

    while (machine.state === "DECISION") {
      machine.submitAction({ type: "fight", technique: technique.slug });
    }

    expect(machine.state).toBe("END");
    expect(machine.outcome).not.toBeNull();
  });

  it("player attacks first — so with equal stats, player wins", () => {
    machine.intro();
    const technique = player.techniques[0];
    while (machine.state === "DECISION") {
      machine.submitAction({ type: "fight", technique: technique.slug });
    }
    expect(machine.outcome).toBe("win");
  });

  it("flee succeeds when roll passes", () => {
    machine.intro();
    const events = machine.submitAction({ type: "run" });
    expect(events.some((e) => e.type === "flee_success")).toBe(true);
    expect(machine.state).toBe("END");
    expect(machine.outcome).toBe("fled");
  });

  it("flee fails when roll does not pass", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    machine.intro();
    const events = machine.submitAction({ type: "run" });
    expect(events.some((e) => e.type === "flee_fail")).toBe(true);
    expect(events.some((e) => e.type === "enemy_attack")).toBe(true);
    expect(machine.state).toBe("DECISION");
  });

  it("ignores actions when not in DECISION state", () => {
    const events = machine.submitAction({ type: "fight", technique: "scratch" });
    expect(events).toHaveLength(0);
  });

  it("uses the specified technique for the attack", () => {
    machine.intro();
    const events = machine.submitAction({ type: "fight", technique: "ram" });
    const attackEvent = events.find((e) => e.type === "player_attack");
    expect(attackEvent?.message).toContain("Ram");
  });

  it("drains DP based on technique cost", () => {
    machine.intro();
    expect(machine.darkPower).toBe(5);
    // Scratch costs 1 DP
    machine.submitAction({ type: "fight", technique: "scratch" });
    expect(machine.darkPower).toBe(4);
  });

  it("canAfford returns false when DP is insufficient", () => {
    machine.intro();
    const ram = player.techniques.find((t) => t.slug === "ram")!;
    // ram costs 2 DP
    machine.darkPower = 1;
    expect(machine.canAfford(ram)).toBe(false);
    machine.darkPower = 2;
    expect(machine.canAfford(ram)).toBe(true);
  });

  it("canFight is true when any technique is affordable", () => {
    machine.intro();
    // rockitten's cheapest L5 moves (ram, boulder) cost 2 DP each
    machine.darkPower = 2;
    expect(machine.canFight()).toBe(true);
    machine.darkPower = 1;
    expect(machine.canFight()).toBe(false);
  });

  it("player at level 5 has the rockitten L1-L4 moveset", () => {
    expect(player.techniques.map((t) => t.slug)).toEqual(["ram", "boulder", "mudslide"]);
  });

  it("constructor accepts an initialDarkPower override", () => {
    // STORY-0231: CombatScene seeds the machine from session.player.darkPower
    // so DP carries between battles. Default must stay at MAX_DARK_POWER.
    const seeded = new CombatMachine(
      player,
      enemy,
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      2,
    );
    expect(seeded.darkPower).toBe(2);
    const defaulted = new CombatMachine(player, enemy);
    expect(defaulted.darkPower).toBe(5);
  });
});
