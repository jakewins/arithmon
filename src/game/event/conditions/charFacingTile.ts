import type { EventCondition, EventContext, EventDef } from "../types";
import { registerCondition } from "../registry";

class CharFacingTileCondition implements EventCondition {
  type = "char_facing_tile";

  test(ctx: EventContext, def: EventDef): boolean {
    if (def.x === undefined || def.y === undefined) return false;

    const { tileX, tileY, facing } = ctx.player;
    const w = def.width ?? 1;
    const h = def.height ?? 1;

    let facingX = tileX;
    let facingY = tileY;
    if (facing === "up") facingY -= 1;
    else if (facing === "down") facingY += 1;
    else if (facing === "left") facingX -= 1;
    else if (facing === "right") facingX += 1;

    return facingX >= def.x && facingX < def.x + w && facingY >= def.y && facingY < def.y + h;
  }
}

registerCondition("char_facing_tile", () => new CharFacingTileCondition());
