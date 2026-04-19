import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";
import { MAX_TECHNIQUES } from "../../model/Monster";

class CheckMaxTechCondition implements EventCondition {
  type = "check_max_tech";
  private monsterVar: string;

  constructor(args: string[]) {
    // Format: monster_var (index into party stored in game variables)
    this.monsterVar = args[0] ?? "";
  }

  test(ctx: EventContext): boolean {
    const indexStr = ctx.variables.get(this.monsterVar);
    if (indexStr === undefined) return false;
    const mon = ctx.session.player.monsters[Number(indexStr)];
    if (!mon) return false;
    return mon.techniques.length >= MAX_TECHNIQUES;
  }
}

registerCondition("check_max_tech", (args) => new CheckMaxTechCondition(args));
