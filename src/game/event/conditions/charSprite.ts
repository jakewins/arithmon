import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class CharSpriteCondition implements EventCondition {
  type = "char_sprite";
  private template: string;

  constructor(args: string[]) {
    // Format: player,template_name
    this.template = args[1] ?? "";
  }

  test(ctx: EventContext): boolean {
    return ctx.session.player.template === this.template;
  }
}

registerCondition("char_sprite", (args) => new CharSpriteCondition(args));
