import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class SetTeleportFaintAction implements EventAction {
  type = "set_teleport_faint";
  done = false;

  private mapKey: string;
  private tileX: number;
  private tileY: number;

  constructor(args: string[]) {
    // set_teleport_faint player,map.tmx,tileX,tileY
    const rawMap = args[1];
    this.mapKey = rawMap.replace(/\.tmx$/, "");
    this.tileX = parseInt(args[2], 10);
    this.tileY = parseInt(args[3], 10);
  }

  start(ctx: EventContext): void {
    ctx.session.faintTeleport = {
      mapKey: this.mapKey,
      tileX: this.tileX,
      tileY: this.tileY,
    };
    this.done = true;
  }

  update(): void {
    // single-frame action
  }

  cleanup(): void {
    // nothing to clean up
  }
}

registerAction("set_teleport_faint", (args) => new SetTeleportFaintAction(args));
