import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

const TILE_SIZE = 16;

class CameraPositionAction implements EventAction {
  type = "camera_position";
  done = false;

  private targetX: number | null;
  private targetY: number | null;

  constructor(args: string[]) {
    if (args.length === 0 || args[0] === "") {
      this.targetX = null;
      this.targetY = null;
    } else {
      this.targetX = Number(args[0]);
      this.targetY = Number(args[1]);
    }
  }

  start(ctx: EventContext): void {
    const cam = ctx.scene.cameras.main;

    if (this.targetX === null) {
      // Reset to follow player
      const player = (ctx.scene as unknown as Record<string, Phaser.GameObjects.Sprite>).player;
      if (player) {
        cam.startFollow(player, true);
      }
    } else {
      cam.stopFollow();
      cam.centerOn(
        this.targetX * TILE_SIZE + TILE_SIZE / 2,
        this.targetY! * TILE_SIZE + TILE_SIZE / 2,
      );
    }

    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("camera_position", (args) => new CameraPositionAction(args));
