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
    let facingX = tileX;
    let facingY = tileY;
    if (facing === "up") facingY -= 1;
    else if (facing === "down") facingY += 1;
    else if (facing === "left") facingX -= 1;
    else if (facing === "right") facingX += 1;

    return facingX === npc.tileX && facingY === npc.tileY;
  }
}

registerCondition("char_facing_char", (args) => new CharFacingCharCondition(args));
