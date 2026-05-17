import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class CharFacingCharCondition implements EventCondition {
  type = "char_facing_char";
  private npcSlug: string;

  constructor(args: string[]) {
    // args: ["player", "npc_slug"] — first is always player for now
    this.npcSlug = args[1] ?? args[0];
  }

  test(ctx: EventContext): boolean {
    const npc = ctx.npcs.get(this.npcSlug);
    if (!npc) return false;

    const { tileX, tileY, facing } = ctx.player;
    let dx = 0;
    let dy = 0;
    if (facing === "up") dy = -1;
    else if (facing === "down") dy = 1;
    else if (facing === "left") dx = -1;
    else if (facing === "right") dx = 1;

    // Check 1 and 2 tiles ahead so interactions work across counters
    for (let dist = 1; dist <= 2; dist++) {
      if (tileX + dx * dist === npc.tileX && tileY + dy * dist === npc.tileY) {
        return true;
      }
    }
    return false;
  }
}

registerCondition("char_facing_char", (args) => new CharFacingCharCondition(args));
