import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class SetTemplateAction implements EventAction {
  type = "set_template";
  done = false;

  private target: string;
  private overworldSprite: string;

  constructor(args: string[]) {
    // Syntax: set_template player,overworld_sprite,battle_sprite
    // We only use the overworld sprite for now.
    this.target = args[0];
    this.overworldSprite = args[1];
  }

  start(ctx: EventContext): void {
    if (this.target === "player") {
      ctx.session.player.template = this.overworldSprite;
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

registerAction("set_template", (args) => new SetTemplateAction(args));
