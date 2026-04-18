import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { destroyOverlay, setOverlay, NAMED_COLORS, WIDTH, HEIGHT } from "./changeBgShared";

class ChangeBgAction implements EventAction {
  type = "change_bg";
  done = false;

  private color: number;
  private imageKey: string | null;

  private clearOnly: boolean;

  constructor(args: string[]) {
    // No-arg form: change_bg — dismiss overlay
    if (args.length === 0 || !args[0]) {
      this.color = 0;
      this.imageKey = null;
      this.clearOnly = true;
      return;
    }

    this.clearOnly = false;
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
    if (this.clearOnly) {
      destroyOverlay(ctx.scene);
      this.done = true;
      return;
    }

    ctx.scene.cameras.main.setBackgroundColor(this.color);
    destroyOverlay(ctx.scene);

    if (this.imageKey && ctx.scene.textures?.exists(this.imageKey)) {
      const img = ctx.scene.add.image(WIDTH / 2, HEIGHT / 2, this.imageKey);
      img.setDepth(50).setScrollFactor(0);
      setOverlay(ctx.scene, null, img);
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
