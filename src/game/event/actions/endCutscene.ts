import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class EndCutsceneAction implements EventAction {
  type = "end_cutscene";
  done = false;

  start(ctx: EventContext): void {
    ctx.controls.cutsceneDone = true;
    this.done = true;
  }

  update(): void {
    // single-frame
  }

  cleanup(): void {
    // nothing to clean up
  }
}

registerAction("end_cutscene", () => new EndCutsceneAction());
