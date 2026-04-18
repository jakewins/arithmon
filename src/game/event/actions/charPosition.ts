import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { FACING_FRAMES } from "./charFace";

const TILE_SIZE = 16;

class CharPositionAction implements EventAction {
  type = "char_position";
  done = false;

  private target: string;
  private tileX: number;
  private tileY: number;

  constructor(args: string[]) {
    this.target = args[0];
    this.tileX = parseInt(args[1], 10);
    this.tileY = parseInt(args[2], 10);
  }

  start(ctx: EventContext): void {
    if (this.target === "player") {
      ctx.player.tileX = this.tileX;
      ctx.player.tileY = this.tileY;
      const scene = ctx.scene as { player?: Phaser.GameObjects.Sprite };
      if (scene.player) {
        scene.player.x = this.tileX * TILE_SIZE + TILE_SIZE / 2;
        scene.player.y = this.tileY * TILE_SIZE;
      }
    } else {
      const npc = ctx.npcs.get(this.target);
      if (npc) {
        npc.tileX = this.tileX;
        npc.tileY = this.tileY;
        npc.sprite.x = this.tileX * TILE_SIZE + TILE_SIZE / 2;
        npc.sprite.y = this.tileY * TILE_SIZE;
        npc.sprite.setFrame(FACING_FRAMES[npc.facing]);
      }
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("char_position", (args) => new CharPositionAction(args));
