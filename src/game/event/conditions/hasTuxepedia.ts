import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class HasTuxepediaCondition implements EventCondition {
  type = "has_tuxepedia";
  private slug: string;
  private check: string;

  constructor(args: string[]) {
    // Format: slug,caught|seen (or just slug)
    this.slug = args[0] ?? "";
    this.check = args[1] ?? "caught";
  }

  test(ctx: EventContext): boolean {
    const reg = ctx.session.monsterRegistry;
    if (this.check === "caught") return reg.caught.has(this.slug);
    if (this.check === "seen") return reg.seen.has(this.slug);
    return reg.caught.has(this.slug) || reg.seen.has(this.slug);
  }
}

registerCondition("has_tuxepedia", (args) => new HasTuxepediaCondition(args));
