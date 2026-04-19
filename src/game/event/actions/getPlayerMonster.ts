import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class GetPlayerMonsterAction implements EventAction {
  type = "get_player_monster";
  done = false;
  private varName: string;

  constructor(args: string[]) {
    // Format: player,variable_name
    this.varName = args[1] ?? "monster_var";
  }

  start(ctx: EventContext): void {
    const party = ctx.session.player.monsters;
    if (party.length > 0) {
      ctx.variables.set(this.varName, "0"); // index into party
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("get_player_monster", (args) => new GetPlayerMonsterAction(args));
