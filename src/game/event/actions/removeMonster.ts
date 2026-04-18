import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class RemoveMonsterAction implements EventAction {
  type = "remove_monster";
  done = false;

  private identifier: string;

  constructor(args: string[]) {
    this.identifier = args[0];
  }

  start(ctx: EventContext): void {
    const party = ctx.session.player.monsters;
    const slot = parseInt(this.identifier, 10);

    if (!isNaN(slot) && slot >= 0 && slot < party.length) {
      party.splice(slot, 1);
    } else {
      // Try to find by instance id
      const idx = party.findIndex((m) => m.id === this.identifier);
      if (idx !== -1) party.splice(idx, 1);
    }

    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("remove_monster", (args) => new RemoveMonsterAction(args));
