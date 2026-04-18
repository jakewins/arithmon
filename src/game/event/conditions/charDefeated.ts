import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class CharDefeatedCondition implements EventCondition {
  type = "char_defeated";

  private target: string;

  constructor(args: string[]) {
    // Syntax: char_defeated player
    this.target = args[0];
  }

  test(ctx: EventContext): boolean {
    if (this.target === "player") {
      const party = ctx.session.player.monsters;
      return party.length > 0 && party.every((m) => m.fainted);
    }
    return false;
  }
}

registerCondition("char_defeated", (args) => new CharDefeatedCondition(args));
