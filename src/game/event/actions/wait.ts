import type { EventAction } from "../types";
import { registerAction } from "../registry";

class WaitAction implements EventAction {
  type = "wait";
  done = false;

  private duration: number;
  private elapsed = 0;

  constructor(args: string[]) {
    this.duration = parseFloat(args[0]) || 1;
  }

  start(): void {
    this.elapsed = 0;
  }

  update(_ctx: unknown, dt: number): void {
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.done = true;
    }
  }

  cleanup(): void {
    // nothing
  }
}

registerAction("wait", (args) => new WaitAction(args));
