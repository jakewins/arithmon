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

class ChangeBgAction implements EventAction {
  type = "change_bg";
  done = false;

  private color: number;

  constructor(args: string[]) {
    const name = args[0];
    if (name in NAMED_COLORS) {
      this.color = NAMED_COLORS[name];
    } else if (name.startsWith("#")) {
      this.color = parseInt(name.slice(1), 16);
    } else {
      // Fallback for unrecognised values (e.g. Tuxemon gradient names)
      this.color = NAMED_COLORS["black"];
    }
  }

  start(ctx: EventContext): void {
    ctx.scene.cameras.main.setBackgroundColor(this.color);
    this.done = true;
  }

  update(): void {
    // single-frame
  }

  cleanup(): void {
    // nothing to clean up
  }
}

registerAction("change_bg", (args) => new ChangeBgAction(args));
