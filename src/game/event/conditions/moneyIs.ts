import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

function compare(value: number, operator: string, target: number): boolean {
  switch (operator) {
    case "greater_than":
      return value > target;
    case "less_than":
      return value < target;
    case "equals":
      return value === target;
    case "greater_or_equal":
      return value >= target;
    case "less_or_equal":
      return value <= target;
    default:
      console.warn(`money_is: unknown operator "${operator}"`);
      return false;
  }
}

class MoneyIsCondition implements EventCondition {
  type = "money_is";

  private operator: string;
  private amount: number;

  constructor(args: string[]) {
    // Format: player,operator,amount
    this.operator = args[1];
    this.amount = Number(args[2]);
  }

  test(ctx: EventContext): boolean {
    return compare(ctx.session.player.money, this.operator, this.amount);
  }
}

registerCondition("money_is", (args) => new MoneyIsCondition(args));
