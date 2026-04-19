import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class TeleportFaintAction implements EventAction {
  type = "teleport_faint";
  done = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_args: string[]) {}

  start(ctx: EventContext): void {
    const faint = ctx.session.faintTeleport;
    if (faint) {
      ctx.controls.pendingTeleport = {
        mapKey: faint.mapKey,
        tileX: faint.tileX,
        tileY: faint.tileY,
        duration: 0.3,
      };
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("teleport_faint", (args) => new TeleportFaintAction(args));
