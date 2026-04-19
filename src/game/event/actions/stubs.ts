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
