import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { MONSTERS } from "../../data/monsters";
import { Monster } from "../../model/Monster";

class EvolutionAction implements EventAction {
  type = "evolution";
  done = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_args: string[]) {}

  start(ctx: EventContext): void {
    const party = ctx.session.player.monsters;
    for (let i = 0; i < party.length; i++) {
      const mon = party[i];
      const def = MONSTERS[mon.slug];
      if (!def?.evolutions) continue;
      for (const evo of def.evolutions) {
        if (mon.level >= evo.level) {
          const evolved = Monster.spawn(evo.species, mon.level);
          evolved.currentHp = Math.min(mon.currentHp, evolved.maxHp);
          evolved.totalXp = mon.totalXp;
          evolved.bond = mon.bond;
          party[i] = evolved;
          console.log(`${mon.name} evolved into ${evolved.name}!`);
          break;
        }
      }
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("evolution", (args) => new EvolutionAction(args));
