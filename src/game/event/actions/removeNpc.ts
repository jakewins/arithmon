import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class RemoveNpcAction implements EventAction {
  type = "remove_npc";
  done = false;

  private slug: string;

  constructor(args: string[]) {
    this.slug = args[0];
  }

  start(ctx: EventContext): void {
    const npc = ctx.npcs.get(this.slug);
    if (npc) {
      npc.sprite.destroy();
      if (npc.collisionBody) {
        npc.collisionBody.destroy();
      }
      ctx.npcs.delete(this.slug);
    }
    this.done = true;
  }

  update(): void {
    // single-frame
  }

  cleanup(): void {
    // nothing
  }
}

registerAction("remove_npc", (args) => new RemoveNpcAction(args));
