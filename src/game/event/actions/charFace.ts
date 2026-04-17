import type { EventAction, EventContext, Direction } from "../types";
import { registerAction } from "../registry";

export const FACING_FRAMES: Record<Direction, number> = {
  down: 1,
  left: 4,
  right: 7,
  up: 10,
};

function directionFromTo(fromX: number, fromY: number, toX: number, toY: number): Direction {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }
  return dy > 0 ? "down" : "up";
}

class CharFaceAction implements EventAction {
  type = "char_face";
  done = false;

  private target: string;
  private dirOrChar: string;

  constructor(args: string[]) {
    this.target = args[0];
    this.dirOrChar = args[1];
  }

  start(ctx: EventContext): void {
    const directions: string[] = ["up", "down", "left", "right"];
    let dir: Direction;

    if (directions.includes(this.dirOrChar)) {
      dir = this.dirOrChar as Direction;
    } else {
      // Face toward another character
      const from = this.getCharPos(ctx, this.target);
      const to = this.getCharPos(ctx, this.dirOrChar);
      if (!from || !to) {
        this.done = true;
        return;
      }
      dir = directionFromTo(from.tileX, from.tileY, to.tileX, to.tileY);
    }

    if (this.target === "player") {
      ctx.player.facing = dir;
      // Update player sprite frame — the scene's player sprite needs to show correct facing
      const scene = ctx.scene as { player?: Phaser.GameObjects.Sprite };
      if (scene.player) {
        scene.player.setFrame(FACING_FRAMES[dir]);
      }
    } else {
      const npc = ctx.npcs.get(this.target);
      if (npc) {
        npc.facing = dir;
        npc.sprite.setFrame(FACING_FRAMES[dir]);
      }
    }

    this.done = true;
  }

  private getCharPos(ctx: EventContext, name: string): { tileX: number; tileY: number } | null {
    if (name === "player") return ctx.player;
    const npc = ctx.npcs.get(name);
    return npc ?? null;
  }

  update(): void {
    // single-frame
  }

  cleanup(): void {
    // nothing
  }
}

registerAction("char_face", (args) => new CharFaceAction(args));
