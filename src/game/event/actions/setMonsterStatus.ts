import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class SetMonsterStatusAction implements EventAction {
  type = "set_monster_status";
  done = false;

  start(ctx: EventContext): void {
    for (const monster of ctx.session.player.monsters) {
      monster.status = [];
    }
    this.done = true;
  }

  update(): void {
    // single-frame action
  }

  cleanup(): void {
    // nothing to clean up
  }
}

registerAction("set_monster_status", () => new SetMonsterStatusAction());
