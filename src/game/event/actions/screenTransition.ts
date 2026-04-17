import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class ScreenTransitionAction implements EventAction {
  type = "screen_transition";
  done = false;

  private duration: number;
  private elapsed = 0;
  private fadedIn = false;

  constructor(args: string[]) {
    this.duration = parseFloat(args[0]) || 1;
  }

  start(ctx: EventContext): void {
    const halfMs = (this.duration / 2) * 1000;
    ctx.scene.cameras.main.fadeOut(halfMs, 0, 0, 0);
  }

  update(ctx: EventContext, dt: number): void {
    this.elapsed += dt;
    const half = this.duration / 2;

    if (!this.fadedIn && this.elapsed >= half) {
      this.fadedIn = true;
      const halfMs = half * 1000;
      ctx.scene.cameras.main.fadeIn(halfMs, 0, 0, 0);
    }

    if (this.elapsed >= this.duration) {
      this.done = true;
    }
  }

  cleanup(): void {
    // nothing
  }
}

registerAction("screen_transition", (args) => new ScreenTransitionAction(args));
