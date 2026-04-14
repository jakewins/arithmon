import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class UnlockControlsAction implements EventAction {
  type = "unlock_controls";
  done = false;

  start(ctx: EventContext): void {
    ctx.controls.locked = false;
    this.done = true;
  }

  update(): void {
    // single-frame
  }

  cleanup(): void {
    // nothing
  }
}

registerAction("unlock_controls", () => new UnlockControlsAction());
