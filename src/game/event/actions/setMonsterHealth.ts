import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class SetMonsterHealthAction implements EventAction {
  type = "set_monster_health";
  done = false;

  start(ctx: EventContext): void {
    for (const monster of ctx.session.player.monsters) {
      monster.currentHp = monster.maxHp;
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

registerAction("set_monster_health", () => new SetMonsterHealthAction());
