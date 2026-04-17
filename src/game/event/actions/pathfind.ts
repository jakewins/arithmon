import type { EventAction, EventContext, Direction } from "../types";
import { registerAction } from "../registry";
import { findPath } from "../pathfinding";

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

  private waypoints: [number, number][] = [];
  private waypointIndex = 0;
  private currentTargetPixelX = 0;
  private currentTargetPixelY = 0;

  constructor(args: string[]) {
    this.slug = args[0];
    this.targetTileX = parseInt(args[1], 10);
    this.targetTileY = parseInt(args[2], 10);
  }

  start(ctx: EventContext): void {
    const npc = ctx.npcs.get(this.slug);
    if (!npc) {
      this.done = true;
      return;
    }

    // Already at destination
    if (npc.tileX === this.targetTileX && npc.tileY === this.targetTileY) {
      this.done = true;
      return;
    }

    if (!ctx.walkGrid) {
      // No grid available — fall through to done (graceful fallback)
      console.warn(`[pathfind] No walkability grid available for NPC "${this.slug}"`);
      this.done = true;
      return;
    }

    this.waypoints = findPath(
      { x: npc.tileX, y: npc.tileY },
      { x: this.targetTileX, y: this.targetTileY },
      ctx.walkGrid,
      ctx.npcs,
      this.slug,
    );

    if (this.waypoints.length === 0) {
      console.warn(
        `[pathfind] No path found for NPC "${this.slug}" from (${npc.tileX},${npc.tileY}) to (${this.targetTileX},${this.targetTileY})`,
      );
      this.done = true;
      return;
    }

    this.waypointIndex = 0;
    this.setCurrentTarget();
    this.updateFacing(npc);
  }

  update(ctx: EventContext, dt: number): void {
    const npc = ctx.npcs.get(this.slug);
    if (!npc) {
      this.done = true;
      return;
    }

    const dx = this.currentTargetPixelX - npc.sprite.x;
    const dy = this.currentTargetPixelY - npc.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const step = NPC_SPEED * dt;

    if (step >= dist || dist < 1) {
      // Snap to current waypoint
      npc.sprite.x = this.currentTargetPixelX;
      npc.sprite.y = this.currentTargetPixelY;
      npc.tileX = this.waypoints[this.waypointIndex][0];
      npc.tileY = this.waypoints[this.waypointIndex][1];

      // Advance to next waypoint
      this.waypointIndex++;
      if (this.waypointIndex >= this.waypoints.length) {
        this.done = true;
        return;
      }

      this.setCurrentTarget();
      this.updateFacing(npc);
    } else {
      npc.sprite.x += (dx / dist) * step;
      npc.sprite.y += (dy / dist) * step;

      // Update tile position in real-time
      npc.tileX = Math.floor(npc.sprite.x / TILE_SIZE);
      npc.tileY = Math.floor(npc.sprite.y / TILE_SIZE);
    }
  }

  private setCurrentTarget(): void {
    const [tx, ty] = this.waypoints[this.waypointIndex];
    this.currentTargetPixelX = tx * TILE_SIZE + TILE_SIZE / 2;
    this.currentTargetPixelY = ty * TILE_SIZE;
  }

  private updateFacing(npc: {
    facing: Direction;
    sprite: { x: number; y: number; setFrame(f: number): void };
  }): void {
    const dx = this.currentTargetPixelX - npc.sprite.x;
    const dy = this.currentTargetPixelY - npc.sprite.y;
    let dir: Direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? "right" : "left";
    } else {
      dir = dy > 0 ? "down" : "up";
    }
    if (dir !== npc.facing) {
      npc.facing = dir;
      npc.sprite.setFrame(FACING_FRAMES[dir]);
    }
  }

  cleanup(): void {
    // NPC stays at destination
  }
}

registerAction("pathfind", (args) => new PathfindAction(args));
