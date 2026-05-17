import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { debugBridge } from "../../debug";

/**
 * Tuxemon syntax:
 *   transition_teleport player,<map>.tmx,<tileX>,<tileY>,<duration>
 *
 * We accept the `.tmx` suffix and strip it so the remaining name matches
 * our map registry keys. The action is multi-frame: it sets
 * `ctx.controls.pendingTeleport` and stays `done: false` until the active
 * scene consumes the flag (fade out, swap maps, fade in).
 */
class TransitionTeleportAction implements EventAction {
  type = "transition_teleport";
  done = false;

  private mapKey: string;
  private tileX: number;
  private tileY: number;
  private duration: number;
  private dispatched = false;

  constructor(args: string[]) {
    // args[0] is the target — only "player" is supported, matching Tuxemon.
    const rawMap = (args[1] ?? "").trim();
    this.mapKey = rawMap.replace(/\.tmx$/i, "");
    this.tileX = parseInt(args[2] ?? "0", 10) || 0;
    this.tileY = parseInt(args[3] ?? "0", 10) || 0;
    this.duration = parseFloat(args[4] ?? "0.3") || 0.3;
  }

  start(ctx: EventContext): void {
    ctx.controls.pendingTeleport = {
      mapKey: this.mapKey,
      tileX: this.tileX,
      tileY: this.tileY,
      duration: this.duration,
      facing: ctx.player.facing,
    };
    this.dispatched = true;
    debugBridge.emit("teleport", { map: this.mapKey, x: this.tileX, y: this.tileY });
  }

  update(ctx: EventContext): void {
    // Stay running while the scene is working on the teleport. Mark done once
    // the scene has consumed the flag (cleared pendingTeleport) so the event
    // engine can move on — useful for tests; in a live scene the teleport
    // typically restarts the scene before this matters.
    if (this.dispatched && !ctx.controls.pendingTeleport) {
      this.done = true;
    }
  }

  cleanup(): void {
    // nothing to clean up
  }
}

registerAction("transition_teleport", (args) => new TransitionTeleportAction(args));
