import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class LockControlsAction implements EventAction {
  type = "lock_controls";
  done = false;

  start(ctx: EventContext): void {
    ctx.controls.locked = true;
    this.done = true;
  }

  update(): void {
    // single-frame
  }

  cleanup(): void {
    // nothing
  }
}

registerAction("lock_controls", () => new LockControlsAction());
