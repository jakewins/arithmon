import type { EventAction } from "../types";
import { registerAction } from "../registry";

/** Creates a stub action that logs a warning and completes immediately. */
function stubAction(name: string): void {
  class StubAction implements EventAction {
    type = name;
    done = false;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_args: string[]) {}

    start(): void {
      console.warn(`${name} (stub — not yet implemented)`);
      this.done = true;
    }

    update(): void {}
    cleanup(): void {}
  }

  registerAction(name, (args) => new StubAction(args));
}

// Niche mechanics — stubbed with warning
stubAction("daycare");
stubAction("dojo_method");
stubAction("char_plague");
stubAction("quarantine");
stubAction("tune_radio");
stubAction("change_taste");
stubAction("add_step_tracker");
stubAction("remove_step_tracker");
// NPC bounded wander — upstream syntax: char_wander <npc>,<period>,<x1>,<y1>,<x2>,<y2>.
// We don't have wander AI yet, so the NPC just stands wherever create_npc put it.
// The NPC remains interactable; only the pacing is missing.
stubAction("char_wander");
// Map animation overlay (e.g. `play_map_animation grass,0.1,noloop,player` —
// the grass-shake effect ride-along with random_encounter triggers). The full
// per-frame overlay is not in scope yet; stubbing keeps the YAML loading.
stubAction("play_map_animation");
