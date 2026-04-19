import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class BillExistsCondition implements EventCondition {
  type = "bill_exists";

  private billName: string;

  constructor(args: string[]) {
    // Format: player,bill_name
    this.billName = args[1];
  }

  test(ctx: EventContext): boolean {
    return this.billName in ctx.session.bills;
  }
}

registerCondition("bill_exists", (args) => new BillExistsCondition(args));
