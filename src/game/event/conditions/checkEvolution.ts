import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";
import { MONSTERS } from "../../data/monsters";

class CheckEvolutionCondition implements EventCondition {
  type = "check_evolution";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_args: string[]) {}

  test(ctx: EventContext): boolean {
    for (const mon of ctx.session.player.monsters) {
      const def = MONSTERS[mon.slug];
      if (!def?.evolutions) continue;
      for (const evo of def.evolutions) {
        if (mon.level >= evo.level) return true;
      }
    }
    return false;
  }
}

registerCondition("check_evolution", (args) => new CheckEvolutionCondition(args));
