import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class CheckPartyParameterCondition implements EventCondition {
  type = "check_party_parameter";
  private param: string;
  private value: string;
  private operator: string;
  private threshold: number;

  constructor(args: string[]) {
    // Format: player,param,value,operator,threshold
    this.param = args[1] ?? "";
    this.value = args[2] ?? "";
    this.operator = args[3] ?? "greater_than";
    this.threshold = Number(args[4] ?? "0");
  }

  test(ctx: EventContext): boolean {
    let count = 0;
    for (const mon of ctx.session.player.monsters) {
      if (String((mon as unknown as Record<string, unknown>)[this.param]) === this.value) {
        count++;
      }
    }
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

registerCondition("check_party_parameter", (args) => new CheckPartyParameterCondition(args));
