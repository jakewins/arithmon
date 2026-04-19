import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class HasKennelCondition implements EventCondition {
  type = "has_kennel";
  private kennelName: string;
  private operator: string;
  private threshold: number;

  constructor(args: string[]) {
    // Format: player,kennel_name,operator,threshold
    this.kennelName = args[1] ?? "Kennel";
    this.operator = args[2] ?? "greater_than";
    this.threshold = Number(args[3] ?? "0");
  }

  test(ctx: EventContext): boolean {
    const kennel = ctx.session.kennels[this.kennelName];
    const count = kennel ? kennel.monsters.length : 0;
    switch (this.operator) {
      case "greater_than":
        return count > this.threshold;
      case "less_than":
        return count < this.threshold;
      case "equals":
        return count === this.threshold;
      case "greater_or_equal":
        return count >= this.threshold;
      case "less_or_equal":
        return count <= this.threshold;
      default:
        return false;
    }
  }
}

registerCondition("has_kennel", (args) => new HasKennelCondition(args));
