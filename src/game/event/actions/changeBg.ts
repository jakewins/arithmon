import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

const NAMED_COLORS: Record<string, number> = {
  black: 0x000000,
  white: 0xffffff,
  red: 0xcc0000,
  green: 0x00aa00,
  blue: 0x2244aa,
  gradient_blue: 0x2244aa,
};

const WIDTH = 320;
const HEIGHT = 240;

/**
 * Stash key used to persist the overlay image sprite across consecutive
 * change_bg calls within the same scene. Each call destroys the previous
 * overlay (if any) before optionally creating a new one.
 */
const OVERLAY_KEY = "__changeBgOverlay";

class ChangeBgAction implements EventAction {
  type = "change_bg";
  done = false;

  private color: number;
  private imageKey: string | null;

  constructor(args: string[]) {
    // 1-arg form: change_bg <color>
    // 3-arg form: change_bg <color>,<imageKey>,image
    const name = args[0];
    if (name in NAMED_COLORS) {
      this.color = NAMED_COLORS[name];
    } else if (name.startsWith("#")) {
      this.color = parseInt(name.slice(1), 16);
    } else {
      this.color = NAMED_COLORS["black"];
    }

    // 3-arg form: args = ["color", "imageKey", "image"]
    this.imageKey = args.length >= 3 && args[2] === "image" ? args[1] : null;
  }

  start(ctx: EventContext): void {
    ctx.scene.cameras.main.setBackgroundColor(this.color);

    // Destroy any previous overlay image
    const prev = (ctx.scene as unknown as Record<string, Phaser.GameObjects.Image>)[OVERLAY_KEY];
    if (prev) {
      prev.destroy();
      delete (ctx.scene as unknown as Record<string, unknown>)[OVERLAY_KEY];
    }

    // Create new overlay if requested
    if (this.imageKey && ctx.scene.textures?.exists(this.imageKey)) {
      const img = ctx.scene.add.image(WIDTH / 2, HEIGHT / 2, this.imageKey);
      img.setDepth(50).setScrollFactor(0);
      (ctx.scene as unknown as Record<string, Phaser.GameObjects.Image>)[OVERLAY_KEY] = img;
    }

    this.done = true;
  }

  update(): void {
    // single-frame
  }

  cleanup(): void {
    // nothing to clean up — overlay persists until next change_bg or scene end
  }
}

registerAction("change_bg", (args) => new ChangeBgAction(args));
