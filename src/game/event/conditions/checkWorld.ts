import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

const OVERLAY_KEY = "__layerOverlay";

class CheckWorldCondition implements EventCondition {
  type = "check_world";

  private check: string;

  constructor(args: string[]) {
    this.check = args[0] ?? "layer";
  }

  test(ctx: EventContext): boolean {
    if (this.check === "layer" || this.check === "") {
      const scene = ctx.scene as unknown as Record<string, unknown>;
      return scene[OVERLAY_KEY] != null;
    }
    return false;
  }
}

registerCondition("check_world", (args) => new CheckWorldCondition(args));
