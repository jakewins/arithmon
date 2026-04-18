import type { EventCondition, EventContext, Direction } from "../types";
import { registerCondition } from "../registry";

class CharFacingCondition implements EventCondition {
  type = "char_facing";

  private target: string;
  private direction: Direction;

  constructor(args: string[]) {
    // Syntax: char_facing player,direction  e.g. "player,up"
    this.target = args[0];
    this.direction = args[1] as Direction;
  }

  test(ctx: EventContext): boolean {
    if (this.target === "player") {
      return ctx.player.facing === this.direction;
    }
    const npc = ctx.npcs.get(this.target);
    if (!npc) return false;
    return npc.facing === this.direction;
  }
}

registerCondition("char_facing", (args) => new CharFacingCondition(args));
