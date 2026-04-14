import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class CharExistsCondition implements EventCondition {
  type = "char_exists";
  private slug: string;

  constructor(args: string[]) {
    this.slug = args[0];
  }

  test(ctx: EventContext): boolean {
    return ctx.npcs.has(this.slug);
  }
}

registerCondition("char_exists", (args) => new CharExistsCondition(args));
