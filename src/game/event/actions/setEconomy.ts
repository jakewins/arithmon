import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

/**
 * Assigns an economy config slug to an NPC or the player.
 * Upstream: `set_economy player,spyder_cotton_scoop`
 * Stores the slug as a game variable so open_shop can reference it.
 */
class SetEconomyAction implements EventAction {
  type = "set_economy";
  done = false;

  private slug: string;
  private economySlug: string;

  constructor(args: string[]) {
    // Format: npc_slug,economy_slug
    this.slug = args[0];
    this.economySlug = args[1];
  }

  start(ctx: EventContext): void {
    ctx.variables.set(`economy_${this.slug}`, this.economySlug);
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("set_economy", (args) => new SetEconomyAction(args));
