import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";
import { getItemCount } from "../../item/inventory";

class HasItemCondition implements EventCondition {
  type = "has_item";

  private slug: string;
  private count: number;

  constructor(args: string[]) {
    // Syntax: has_item player,slug[,count]
    this.slug = args[1] ?? args[0];
    this.count = parseInt(args[2] ?? "1", 10);
  }

  test(ctx: EventContext): boolean {
    return getItemCount(ctx.session.player.inventory, this.slug) >= this.count;
  }
}

registerCondition("has_item", (args) => new HasItemCondition(args));
