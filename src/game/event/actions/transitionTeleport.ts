import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { debugBridge } from "../../debug";
import { MAP_REGISTRY } from "../../data/maps";

/**
 * Tuxemon syntax:
 *   transition_teleport player,<map>.tmx,<tileX>,<tileY>,<duration>
 *
 * We strip the `.tmx` suffix and resolve the remaining name case-insensitively
 * against our map registry (upstream filenames are inconsistently cased —
 * e.g. `spyder_routec.tmx` references the registry's `spyder_routeC`). When
 * the target map isn't registered (e.g. unported buildings), we still emit
 * the `teleport` debug event so QA can verify the *intended* destination
 * matches upstream, but skip the actual scene restart so the game stays alive.
 *
 * The action is multi-frame: it sets `ctx.controls.pendingTeleport` and stays
 * `done: false` until the active scene consumes the flag (fade out, swap
 * maps, fade in).
 */
class TransitionTeleportAction implements EventAction {
  type = "transition_teleport";
  done = false;

  private mapKey: string;
  private tileX: number;
  private tileY: number;
  private duration: number;
  private dispatched = false;
  private skippedMissing = false;

  constructor(args: string[]) {
    // args[0] is the target — only "player" is supported, matching Tuxemon.
    const rawMap = (args[1] ?? "").trim().replace(/\.tmx$/i, "");
    this.mapKey = resolveMapKey(rawMap);
    this.tileX = parseInt(args[2] ?? "0", 10) || 0;
    this.tileY = parseInt(args[3] ?? "0", 10) || 0;
    this.duration = parseFloat(args[4] ?? "0.3") || 0.3;
  }

  start(ctx: EventContext): void {
    debugBridge.emit("teleport", { map: this.mapKey, x: this.tileX, y: this.tileY });
    if (!MAP_REGISTRY[this.mapKey]) {
      // Target map not yet ported — surface a warning, leave the player put.
      console.warn(`transition_teleport: target map "${this.mapKey}" not in MAP_REGISTRY`);
      this.skippedMissing = true;
      this.done = true;
      return;
    }
    ctx.controls.pendingTeleport = {
      mapKey: this.mapKey,
      tileX: this.tileX,
      tileY: this.tileY,
      duration: this.duration,
      facing: ctx.player.facing,
    };
    this.dispatched = true;
  }

  update(ctx: EventContext): void {
    if (this.skippedMissing) return;
    // Stay running until the scene consumes pendingTeleport (fades out + swaps).
    if (this.dispatched && !ctx.controls.pendingTeleport) {
      this.done = true;
    }
  }

  cleanup(): void {
    // nothing to clean up
  }
}

/**
 * Match `name` against MAP_REGISTRY keys case-insensitively. Returns the
 * canonical key if found, or the input verbatim if not (so the missing-map
 * warning above logs the upstream-correct name).
 */
function resolveMapKey(name: string): string {
  if (MAP_REGISTRY[name]) return name;
  const lower = name.toLowerCase();
  for (const key of Object.keys(MAP_REGISTRY)) {
    if (key.toLowerCase() === lower) return key;
  }
  return name;
}

registerAction("transition_teleport", (args) => new TransitionTeleportAction(args));
