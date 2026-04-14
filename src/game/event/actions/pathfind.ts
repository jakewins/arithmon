import type { EventAction, EventContext, Direction } from "../types";
import { registerAction } from "../registry";

const TILE_SIZE = 16;
const NPC_SPEED = 60; // pixels per second

const FACING_FRAMES: Record<Direction, number> = {
  down: 1,
  left: 4,
  right: 7,
  up: 10,
};

class PathfindAction implements EventAction {
  type = "pathfind";
  done = false;

  private slug: string;
  private targetTileX: number;
  private targetTileY: number;
  private targetPixelX: number;
  private targetPixelY: number;

  constructor(args: string[]) {
    this.slug = args[0];
    this.targetTileX = parseInt(args[1], 10);
    this.targetTileY = parseInt(args[2], 10);
    this.targetPixelX = this.targetTileX * TILE_SIZE + TILE_SIZE / 2;
    this.targetPixelY = this.targetTileY * TILE_SIZE;
  }

  start(ctx: EventContext): void {
    const npc = ctx.npcs.get(this.slug);
    if (!npc) {
      this.done = true;
      return;
    }

    // Set facing direction toward target
    const dir = this.computeDirection(npc.sprite.x, npc.sprite.y);
    npc.facing = dir;
    npc.sprite.setFrame(FACING_FRAMES[dir]);
  }

  update(ctx: EventContext, dt: number): void {
    const npc = ctx.npcs.get(this.slug);
    if (!npc) {
      this.done = true;
      return;
    }

    const dx = this.targetPixelX - npc.sprite.x;
    const dy = this.targetPixelY - npc.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      // Arrived
      npc.sprite.x = this.targetPixelX;
      npc.sprite.y = this.targetPixelY;
      npc.tileX = this.targetTileX;
      npc.tileY = this.targetTileY;
      this.done = true;
      return;
    }

    const step = NPC_SPEED * dt;
    if (step >= dist) {
      npc.sprite.x = this.targetPixelX;
      npc.sprite.y = this.targetPixelY;
    } else {
      npc.sprite.x += (dx / dist) * step;
      npc.sprite.y += (dy / dist) * step;
    }

    // Update tile position
    npc.tileX = Math.floor(npc.sprite.x / TILE_SIZE);
    npc.tileY = Math.floor(npc.sprite.y / TILE_SIZE);

    // Update facing based on dominant axis
    const dir = this.computeDirection(npc.sprite.x, npc.sprite.y);
    if (dir !== npc.facing) {
      npc.facing = dir;
      npc.sprite.setFrame(FACING_FRAMES[dir]);
    }
  }

  private computeDirection(fromX: number, fromY: number): Direction {
    const dx = this.targetPixelX - fromX;
    const dy = this.targetPixelY - fromY;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? "right" : "left";
    }
    return dy > 0 ? "down" : "up";
  }

  cleanup(): void {
    // NPC stays at destination
  }
}

registerAction("pathfind", (args) => new PathfindAction(args));
