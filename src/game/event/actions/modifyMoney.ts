import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class ModifyMoneyAction implements EventAction {
  type = "modify_money";
  done = false;

  private amount: number;

  constructor(args: string[]) {
    // Format: player,amount
    this.amount = Number(args[1]);
  }

  start(ctx: EventContext): void {
    ctx.session.player.money = Math.max(0, ctx.session.player.money + this.amount);
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("modify_money", (args) => new ModifyMoneyAction(args));
