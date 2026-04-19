import type { EventAction } from "../types";
import { registerAction } from "../registry";

class RandomEncounterAction implements EventAction {
  type = "random_encounter";
  done = false;
  private rate: number;

  constructor(args: string[]) {
    // Format: encounter_table_slug,rate
    this.rate = Number(args[1] ?? "1");
  }

  start(): void {
    // Roll against rate — for now, stub with log
    const roll = Math.random() * 100;
    if (roll < this.rate) {
      console.log("random_encounter: encounter triggered (stub — no battle started)");
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("random_encounter", (args) => new RandomEncounterAction(args));
