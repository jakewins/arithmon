import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

/**
 * Tuxemon syntax:
 *   is char_moved player
 *
 * Returns true on the frame the player completes a tile transition.
 */
class CharMovedCondition implements EventCondition {
  type = "char_moved";

  test(ctx: EventContext): boolean {
    return ctx.playerMoved;
  }
}

registerCondition("char_moved", () => new CharMovedCondition());
