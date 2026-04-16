import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
/** String-typed fields on PlayerState that can be set via this action. */
const PLAYER_STRING_FIELDS = new Set(["name", "gender", "template"]);

class SetCharAttributeAction implements EventAction {
  type = "set_char_attribute";
  done = false;

  private target: string;
  private attribute: string;
  private value: string;

  constructor(args: string[]) {
    this.target = args[0];
    this.attribute = args[1];
    this.value = args[2];
  }

  start(ctx: EventContext): void {
    if (this.target === "player" && PLAYER_STRING_FIELDS.has(this.attribute)) {
      const player = ctx.session.player as unknown as Record<string, unknown>;
      player[this.attribute] = this.value;
    }
    this.done = true;
  }

  update(): void {
    // single-frame
  }

  cleanup(): void {
    // nothing to clean up
  }
}

registerAction("set_char_attribute", (args) => new SetCharAttributeAction(args));
