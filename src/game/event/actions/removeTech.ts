import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class RemoveTechAction implements EventAction {
  type = "remove_tech";
  done = false;
  private monsterVar: string;
  private techSlug: string;

  constructor(args: string[]) {
    // Format: monster_var,technique_slug
    this.monsterVar = args[0];
    this.techSlug = args[1] ?? "";
  }

  start(ctx: EventContext): void {
    const indexStr = ctx.variables.get(this.monsterVar);
    if (indexStr !== undefined) {
      const mon = ctx.session.player.monsters[Number(indexStr)];
      if (mon) {
        mon.techniques = mon.techniques.filter((t) => t.slug !== this.techSlug);
      }
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("remove_tech", (args) => new RemoveTechAction(args));
