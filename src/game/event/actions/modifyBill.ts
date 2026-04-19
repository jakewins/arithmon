import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class ModifyBillAction implements EventAction {
  type = "modify_bill";
  done = false;

  private billName: string;
  private amount: number;

  constructor(args: string[]) {
    // Format: player,bill_name,amount
    this.billName = args[1];
    this.amount = Number(args[2]);
  }

  start(ctx: EventContext): void {
    const current = ctx.session.bills[this.billName] ?? 0;
    ctx.session.bills[this.billName] = current + this.amount;
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("modify_bill", (args) => new ModifyBillAction(args));
