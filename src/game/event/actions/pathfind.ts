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

interface PathfindTarget {
  tileX: number;
  tileY: number;
  facing: Direction;
  sprite: { x: number; y: number; setFrame(f: number): void };
}

class PathfindAction implements EventAction {
  type = "pathfind";
  done = false;

  private slug: string;
  private targetTileX: number;
  private targetTileY: number;
  private isPlayer = false;

  private waypoints: [number, number][] = [];
  private waypointIndex = 0;
  private currentTargetPixelX = 0;
  private currentTargetPixelY = 0;

  constructor(args: string[]) {
    this.slug = args[0];
    this.targetTileX = parseInt(args[1], 10);
    this.targetTileY = parseInt(args[2], 10);
  }

  private getTarget(ctx: EventContext): PathfindTarget | undefined {
    if (this.slug === "player") {
      if (!ctx.playerSprite) return undefined;
      return {
        get tileX() {
          return ctx.player.tileX;
        },
        set tileX(v: number) {
          ctx.player.tileX = v;
        },
        get tileY() {
          return ctx.player.tileY;
        },
        set tileY(v: number) {
          ctx.player.tileY = v;
        },
        get facing() {
          return ctx.player.facing;
        },
        set facing(v: Direction) {
          ctx.player.facing = v;
        },
        sprite: ctx.playerSprite,
      };
    }
    return ctx.npcs.get(this.slug);
  }

  start(ctx: EventContext): void {
    this.isPlayer = this.slug === "player";
    const target = this.getTarget(ctx);
    if (!target) {
      this.done = true;
      return;
    }

    // Already at destination
    if (target.tileX === this.targetTileX && target.tileY === this.targetTileY) {
      this.done = true;
      return;
    }

    if (!ctx.walkGrid) {
      console.warn(`[pathfind] No walkability grid available for "${this.slug}"`);
      this.done = true;
      return;
    }

    this.waypoints = findPath(
      { x: target.tileX, y: target.tileY },
      { x: this.targetTileX, y: this.targetTileY },
      ctx.walkGrid,
      ctx.npcs,
      this.isPlayer ? "__player__" : this.slug,
      ctx.directionalGrid,
    );

    if (this.waypoints.length === 0) {
      console.warn(
        `[pathfind] No path found for "${this.slug}" from (${target.tileX},${target.tileY}) to (${this.targetTileX},${this.targetTileY})`,
      );
      this.done = true;
      return;
    }

    this.waypointIndex = 0;
    this.setCurrentTarget();
    this.updateFacing(target);
  }

  update(ctx: EventContext, dt: number): void {
    const target = this.getTarget(ctx);
    if (!target) {
      this.done = true;
      return;
    }

    const dx = this.currentTargetPixelX - target.sprite.x;
    const dy = this.currentTargetPixelY - target.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const step = NPC_SPEED * dt;

    if (step >= dist || dist < 1) {
      // Snap to current waypoint
      target.sprite.x = this.currentTargetPixelX;
      target.sprite.y = this.currentTargetPixelY;
      target.tileX = this.waypoints[this.waypointIndex][0];
      target.tileY = this.waypoints[this.waypointIndex][1];

      // Advance to next waypoint
      this.waypointIndex++;
      if (this.waypointIndex >= this.waypoints.length) {
        this.done = true;
        return;
      }

      this.setCurrentTarget();
      this.updateFacing(target);
    } else {
      target.sprite.x += (dx / dist) * step;
      target.sprite.y += (dy / dist) * step;

      // Update tile position in real-time
      target.tileX = Math.floor(target.sprite.x / TILE_SIZE);
      target.tileY = Math.floor(target.sprite.y / TILE_SIZE);
    }
  }

  private setCurrentTarget(): void {
    const [tx, ty] = this.waypoints[this.waypointIndex];
    this.currentTargetPixelX = tx * TILE_SIZE + TILE_SIZE / 2;
    this.currentTargetPixelY = ty * TILE_SIZE;
  }

  private updateFacing(target: PathfindTarget): void {
    const dx = this.currentTargetPixelX - target.sprite.x;
    const dy = this.currentTargetPixelY - target.sprite.y;
    let dir: Direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? "right" : "left";
    } else {
      dir = dy > 0 ? "down" : "up";
    }
    if (dir !== target.facing) {
      target.facing = dir;
      target.sprite.setFrame(FACING_FRAMES[dir]);
    }
  }

  cleanup(): void {
    // Target stays at destination
  }
}

registerAction("pathfind", (args) => new PathfindAction(args));
