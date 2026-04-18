import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class HasMonsterCondition implements EventCondition {
  type = "has_monster";

  private slug: string;

  constructor(args: string[]) {
    // Syntax: has_monster player,slug
    this.slug = args[1] ?? args[0];
  }

  test(ctx: EventContext): boolean {
    return ctx.session.player.monsters.some((m) => m.slug === this.slug);
  }
}

registerCondition("has_monster", (args) => new HasMonsterCondition(args));
