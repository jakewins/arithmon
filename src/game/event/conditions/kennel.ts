import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class KennelCondition implements EventCondition {
  type = "kennel";
  private kennelName: string;
  private check: string;

  constructor(args: string[]) {
    // Format: player,kennel_name,exist|visible
    this.kennelName = args[1] ?? "Kennel";
    this.check = args[2] ?? "exist";
  }

  test(ctx: EventContext): boolean {
    const kennel = ctx.session.kennels[this.kennelName];
    if (this.check === "exist") return kennel != null;
    if (this.check === "visible") return kennel?.visible ?? false;
    return false;
  }
}

registerCondition("kennel", (args) => new KennelCondition(args));
