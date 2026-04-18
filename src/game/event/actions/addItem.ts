import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { addItem } from "../../item/inventory";

class AddItemAction implements EventAction {
  type = "add_item";
  done = false;

  private slug: string;
  private count: number;

  constructor(args: string[]) {
    this.slug = args[0];
    this.count = parseInt(args[1] ?? "1", 10) || 1;
  }

  start(ctx: EventContext): void {
    addItem(ctx.session.player.inventory, this.slug, this.count);
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("add_item", (args) => new AddItemAction(args));
