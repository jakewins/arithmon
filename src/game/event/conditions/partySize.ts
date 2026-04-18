import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class PartySizeCondition implements EventCondition {
  type = "party_size";

  private operator: string;
  private value: number;

  constructor(args: string[]) {
    // Syntax: party_size player,operator,value  e.g. "player,greater_than,0"
    this.operator = args[1] ?? "greater_than";
    this.value = parseInt(args[2] ?? "0", 10);
  }

  test(ctx: EventContext): boolean {
    const size = ctx.session.player.monsters.length;
    switch (this.operator) {
      case "equals":
        return size === this.value;
      case "greater_than":
        return size > this.value;
      case "less_than":
        return size < this.value;
      default:
        return size > this.value;
    }
  }
}

registerCondition("party_size", (args) => new PartySizeCondition(args));
