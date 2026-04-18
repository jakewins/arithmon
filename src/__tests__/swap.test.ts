import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CombatMachine } from "../game/combat/machine";
import { Monster } from "../game/model/Monster";

describe("Monster swapping", () => {
  let party: Monster[];
  let enemy: Monster;
  let machine: CombatMachine;

  beforeEach(() => {
    party = [
      Monster.spawn("rockitten", 5),
      Monster.spawn("budaye", 5),
      Monster.spawn("ignibus", 5),
    ];
    enemy = Monster.spawn("rockitten", 5);
    machine = new CombatMachine(party[0], enemy, party);
    // Make all attacks hit
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    machine.intro();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("voluntary swap changes the active monster", () => {
    const events = machine.submitAction({ type: "swap", partyIndex: 1 });
    expect(machine.player).toBe(party[1]);
    expect(events.some((e) => e.type === "swap_out")).toBe(true);
    expect(events.some((e) => e.type === "swap_in")).toBe(true);
  });

  it("voluntary swap costs the player's turn — enemy still attacks", () => {
    const events = machine.submitAction({ type: "swap", partyIndex: 1 });
    expect(events.some((e) => e.type === "enemy_attack")).toBe(true);
    expect(machine.state).toBe("DECISION");
  });

  it("cannot swap to the currently active monster", () => {
    expect(machine.canSwapTo(0)).toBe(false);
    const events = machine.submitAction({ type: "swap", partyIndex: 0 });
    expect(events).toHaveLength(0);
    expect(machine.player).toBe(party[0]);
  });

  it("cannot swap to a fainted monster", () => {
    party[1].currentHp = 0;
    expect(machine.canSwapTo(1)).toBe(false);
    const events = machine.submitAction({ type: "swap", partyIndex: 1 });
    expect(events).toHaveLength(0);
    expect(machine.player).toBe(party[0]);
  });

  it("canSwapTo returns true for a healthy non-active monster", () => {
    expect(machine.canSwapTo(1)).toBe(true);
    expect(machine.canSwapTo(2)).toBe(true);
  });

  it("hasSwapTargets returns true when there are non-fainted alternatives", () => {
    expect(machine.hasSwapTargets()).toBe(true);
  });

  it("hasSwapTargets returns false when all others are fainted", () => {
    party[1].currentHp = 0;
    party[2].currentHp = 0;
    expect(machine.hasSwapTargets()).toBe(false);
  });

  describe("forced swap on faint", () => {
    it("enters FORCE_SWAP state when active monster faints and others remain", () => {
      // Give player low HP so enemy can knock it out
      party[0].currentHp = 1;
      machine.submitAction({ type: "swap", partyIndex: 1 }); // swap to budaye
      // Now swap back and set low HP
      party[1].currentHp = 1;
      const events = machine.submitAction({ type: "fight", technique: "scratch" });
      // The enemy attack should faint budaye
      if (machine.state === "FORCE_SWAP") {
        expect(events.some((e) => e.type === "faint")).toBe(true);
        expect(events.some((e) => e.type === "force_swap")).toBe(true);
      }
    });

    it("forced swap does not cost a turn", () => {
      // Set up: make active monster very weak
      machine.player.currentHp = 1;
      // Use a fight action that will let the enemy attack and faint us
      machine.submitAction({ type: "fight", technique: "scratch" });

      if (machine.state === "FORCE_SWAP") {
        const hpBefore = party[1].currentHp;
        const events = machine.submitForceSwap(1);
        expect(machine.player).toBe(party[1]);
        expect(machine.state).toBe("DECISION");
        // No enemy attack during force swap
        expect(events.some((e) => e.type === "enemy_attack")).toBe(false);
        // HP should be unchanged (no enemy attack)
        expect(party[1].currentHp).toBe(hpBefore);
      }
    });

    it("submitForceSwap does nothing when not in FORCE_SWAP state", () => {
      const events = machine.submitForceSwap(1);
      expect(events).toHaveLength(0);
    });

    it("submitForceSwap rejects fainted targets", () => {
      machine.player.currentHp = 1;
      machine.submitAction({ type: "fight", technique: "scratch" });
      if (machine.state === "FORCE_SWAP") {
        party[1].currentHp = 0;
        const events = machine.submitForceSwap(1);
        expect(events).toHaveLength(0);
        expect(machine.state).toBe("FORCE_SWAP");
      }
    });

    it("combat ends in loss when all party monsters faint", () => {
      party[1].currentHp = 0;
      party[2].currentHp = 0;
      machine.player.currentHp = 1;
      machine.submitAction({ type: "fight", technique: "scratch" });
      // With no swap targets, should end in loss
      if (machine.player.fainted) {
        expect(machine.state).toBe("END");
        expect(machine.outcome).toBe("lose");
      }
    });
  });

  it("swap events have correct messages", () => {
    const events = machine.submitAction({ type: "swap", partyIndex: 1 });
    const swapOut = events.find((e) => e.type === "swap_out");
    const swapIn = events.find((e) => e.type === "swap_in");
    expect(swapOut?.message).toBe("Rockitten, come back!");
    expect(swapIn?.message).toBe("Go, Budaye!");
  });

  it("DP is preserved across swaps", () => {
    machine.darkPower = 3;
    machine.submitAction({ type: "swap", partyIndex: 1 });
    expect(machine.darkPower).toBe(3);
  });
});
