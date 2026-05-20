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

/**
 * Upstream's `create_npc` accepts an optional 4th argument that may be either
 * a facing direction (down/left/right/up) or a behavior keyword (wander, path,
 * none, etc.). Behaviors aren't implemented yet — we accept and ignore them so
 * the action doesn't crash and the NPC defaults to facing down.
 */
const KNOWN_DIRECTIONS = new Set<Direction>(["up", "down", "left", "right"]);

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
    const fourth = args[3];
    if (fourth && KNOWN_DIRECTIONS.has(fourth as Direction)) {
      this.facing = fourth as Direction;
    } else {
      // Unknown/behavior keyword (e.g. "wander") — fall back to facing down.
      this.facing = "down";
    }
  }

  start(ctx: EventContext): void {
    const pixelX = this.tileX * TILE_SIZE + TILE_SIZE / 2;

    const { spritesheet, staticProp } = getNpcSprite(this.slug);

    // Static props anchor at bottom-center on the tile bottom so off-size
    // sprites (16x16, 32x32, multi-tile) sit correctly on their placement
    // tile. Walking sprites keep default origin (centered, vertical center on
    // tile top — gives feet at tile bottom for a 16x32 sprite).
    const pixelY = staticProp ? this.tileY * TILE_SIZE + TILE_SIZE : this.tileY * TILE_SIZE;

    const frame = staticProp ? 0 : FACING_FRAMES[this.facing];
    const sprite = ctx.scene.add.sprite(pixelX, pixelY, spritesheet, frame);
    if (staticProp) sprite.setOrigin(0.5, 1);
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
