import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class GetPartyMonsterAction implements EventAction {
  type = "get_party_monster";
  done = false;
  private varName: string;
  private filterKey: string;
  private filterValue: string;

  constructor(args: string[]) {
    // Format: player,variable_name[,filter_key,filter_value]
    this.varName = args[1] ?? "monster_var";
    this.filterKey = args[2] ?? "";
    this.filterValue = args[3] ?? "";
  }

  start(ctx: EventContext): void {
    const party = ctx.session.player.monsters;
    for (let i = 0; i < party.length; i++) {
      if (
        this.filterKey &&
        String((party[i] as unknown as Record<string, unknown>)[this.filterKey]) !==
          this.filterValue
      ) {
        continue;
      }
      ctx.variables.set(this.varName, String(i));
      break;
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("get_party_monster", (args) => new GetPartyMonsterAction(args));
