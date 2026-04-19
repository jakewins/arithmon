import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class SetBillAction implements EventAction {
  type = "set_bill";
  done = false;

  private billName: string;
  private amount: number;

  constructor(args: string[]) {
    // Format: player,bill_name,amount
    this.billName = args[1];
    this.amount = Number(args[2]);
  }

  start(ctx: EventContext): void {
    ctx.session.bills[this.billName] = this.amount;
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("set_bill", (args) => new SetBillAction(args));
