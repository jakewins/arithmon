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
      console.warn(`bill_is: unknown operator "${operator}"`);
      return false;
  }
}

class BillIsCondition implements EventCondition {
  type = "bill_is";

  private billName: string;
  private operator: string;
  private amount: number;

  constructor(args: string[]) {
    // Format: player,bill_name,operator,amount
    this.billName = args[1];
    this.operator = args[2];
    this.amount = Number(args[3]);
  }

  test(ctx: EventContext): boolean {
    const billAmount = ctx.session.bills[this.billName];
    if (billAmount === undefined) return false;
    return compare(billAmount, this.operator, this.amount);
  }
}

registerCondition("bill_is", (args) => new BillIsCondition(args));
