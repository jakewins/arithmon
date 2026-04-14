import type { EventCondition, EventContext, EventDef } from "../types";
import { registerCondition } from "../registry";

class CharAtCondition implements EventCondition {
  type = "char_at";

  test(ctx: EventContext, def: EventDef): boolean {
    if (def.x === undefined || def.y === undefined) return false;

    const { tileX, tileY } = ctx.player;
    const w = def.width ?? 1;
    const h = def.height ?? 1;

    return tileX >= def.x && tileX < def.x + w && tileY >= def.y && tileY < def.y + h;
  }
}

registerCondition("char_at", () => new CharAtCondition());
