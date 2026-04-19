import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class ModifyMonsterBondAction implements EventAction {
  type = "modify_monster_bond";
  done = false;
  private monsterVar: string;
  private amount: number;

  constructor(args: string[]) {
    // Format: player,monster_var,amount
    this.monsterVar = args[1];
    this.amount = Number(args[2]);
  }

  start(ctx: EventContext): void {
    const indexStr = ctx.variables.get(this.monsterVar);
    if (indexStr !== undefined) {
      const mon = ctx.session.player.monsters[Number(indexStr)];
      if (mon) {
        mon.bond += this.amount;
      }
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("modify_monster_bond", (args) => new ModifyMonsterBondAction(args));
