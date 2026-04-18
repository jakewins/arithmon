import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { FACING_FRAMES } from "./charFace";

class CharStopAction implements EventAction {
  type = "char_stop";
  done = false;

  private target: string;

  constructor(args: string[]) {
    this.target = args[0];
  }

  start(ctx: EventContext): void {
    if (this.target === "player") {
      const scene = ctx.scene as { player?: Phaser.GameObjects.Sprite };
      if (scene.player) {
        scene.player.setFrame(FACING_FRAMES[ctx.player.facing]);
      }
    } else {
      const npc = ctx.npcs.get(this.target);
      if (npc) {
        npc.sprite.setFrame(FACING_FRAMES[npc.facing]);
      }
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("char_stop", (args) => new CharStopAction(args));
