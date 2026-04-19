import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

/** Key used to store the overlay rectangle on the scene for later removal. */
const OVERLAY_KEY = "__layerOverlay";

class SetLayerAction implements EventAction {
  type = "set_layer";
  done = false;

  private rgba: { r: number; g: number; b: number; a: number } | null;

  constructor(args: string[]) {
    if (args.length === 0 || args[0] === "") {
      this.rgba = null; // clear overlay
    } else {
      const parts = args[0].split(":");
      this.rgba = {
        r: Number(parts[0]),
        g: Number(parts[1]),
        b: Number(parts[2]),
        a: Number(parts[3]),
      };
    }
  }

  start(ctx: EventContext): void {
    const scene = ctx.scene as unknown as Record<string, unknown>;

    // Remove existing overlay if any
    const existing = scene[OVERLAY_KEY] as Phaser.GameObjects.Rectangle | undefined;
    if (existing) {
      existing.destroy();
      delete scene[OVERLAY_KEY];
    }

    if (this.rgba) {
      const cam = ctx.scene.cameras.main;
      const color = Phaser.Display.Color.GetColor(this.rgba.r, this.rgba.g, this.rgba.b);
      const overlay = ctx.scene.add
        .rectangle(cam.scrollX, cam.scrollY, cam.width, cam.height, color, this.rgba.a / 255)
        .setOrigin(0, 0)
        .setDepth(50)
        .setScrollFactor(0);

      scene[OVERLAY_KEY] = overlay;
    }

    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("set_layer", (args) => new SetLayerAction(args));
