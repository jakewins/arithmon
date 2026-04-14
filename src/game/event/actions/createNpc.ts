import type { EventAction, EventContext, Direction } from "../types";
import { registerAction } from "../registry";
import { getNpcSprite } from "../../data/npcs";

const TILE_SIZE = 16;

const FACING_FRAMES: Record<Direction, number> = {
  down: 1,
  left: 4,
  right: 7,
  up: 10,
};

class CreateNpcAction implements EventAction {
  type = "create_npc";
  done = false;

  private slug: string;
  private tileX: number;
  private tileY: number;
  private facing: Direction;

  constructor(args: string[]) {
    this.slug = args[0];
    this.tileX = parseInt(args[1], 10);
    this.tileY = parseInt(args[2], 10);
    this.facing = (args[3] as Direction) ?? "down";
  }

  start(ctx: EventContext): void {
    const pixelX = this.tileX * TILE_SIZE + TILE_SIZE / 2;
    const pixelY = this.tileY * TILE_SIZE;

    const { spritesheet } = getNpcSprite(this.slug);

    const sprite = ctx.scene.add.sprite(pixelX, pixelY, spritesheet, FACING_FRAMES[this.facing]);
    sprite.setDepth(5);

    ctx.npcs.set(this.slug, {
      slug: this.slug,
      tileX: this.tileX,
      tileY: this.tileY,
      facing: this.facing,
      sprite,
    });

    this.done = true;
  }

  update(): void {
    // single-frame
  }

  cleanup(): void {
    // NPC persists after action completes
  }
}

registerAction("create_npc", (args) => new CreateNpcAction(args));
