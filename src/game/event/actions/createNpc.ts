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

    const { spritesheet, staticProp } = getNpcSprite(this.slug);

    const frame = staticProp ? 0 : FACING_FRAMES[this.facing];
    const sprite = ctx.scene.add.sprite(pixelX, pixelY, spritesheet, frame);
    sprite.setDepth(5);

    // Add a collision body so the player can't walk through the NPC
    let collisionBody: Phaser.GameObjects.Rectangle | undefined;
    if (ctx.collisionBodies) {
      const bodyY = this.tileY * TILE_SIZE + TILE_SIZE / 2;
      collisionBody = ctx.scene.add.rectangle(pixelX, bodyY, TILE_SIZE, TILE_SIZE);
      collisionBody.setVisible(false);
      ctx.collisionBodies.add(collisionBody);
    }

    ctx.npcs.set(this.slug, {
      slug: this.slug,
      tileX: this.tileX,
      tileY: this.tileY,
      facing: this.facing,
      sprite,
      collisionBody,
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
