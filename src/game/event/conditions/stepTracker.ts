import type { EventCondition } from "../types";
import { registerCondition } from "../registry";

class StepTrackerCondition implements EventCondition {
  type = "step_tracker";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_args: string[]) {}

  test(): boolean {
    // Stub: step tracking not yet implemented
    return false;
  }
}

registerCondition("step_tracker", (args) => new StepTrackerCondition(args));
