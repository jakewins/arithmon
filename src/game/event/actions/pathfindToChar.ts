import type { EventAction, EventContext, Direction } from "../types";
import { registerAction } from "../registry";
import { findPath } from "../pathfinding";

const TILE_SIZE = 16;
const NPC_SPEED = 60;

const FACING_FRAMES: Record<Direction, number> = {
  down: 1,
  left: 4,
  right: 7,
  up: 10,
};

class PathfindToCharAction implements EventAction {
  type = "pathfind_to_char";
  done = false;

  private slug: string;
  private targetSlug: string;

  private waypoints: [number, number][] = [];
  private waypointIndex = 0;
  private currentTargetPixelX = 0;
  private currentTargetPixelY = 0;

  constructor(args: string[]) {
    this.slug = args[0];
    this.targetSlug = args[1];
  }

  start(ctx: EventContext): void {
    const npc = ctx.npcs.get(this.slug);
    if (!npc) {
      this.done = true;
      return;
    }

    let targetX: number, targetY: number;
    if (this.targetSlug === "player") {
      targetX = ctx.player.tileX;
      targetY = ctx.player.tileY;
    } else {
      const target = ctx.npcs.get(this.targetSlug);
      if (!target) {
        this.done = true;
        return;
      }
      targetX = target.tileX;
      targetY = target.tileY;
    }

    if (npc.tileX === targetX && npc.tileY === targetY) {
      this.done = true;
      return;
    }

    if (!ctx.walkGrid) {
      console.warn(`[pathfind_to_char] No walkability grid available for NPC "${this.slug}"`);
      this.done = true;
      return;
    }

    this.waypoints = findPath(
      { x: npc.tileX, y: npc.tileY },
      { x: targetX, y: targetY },
      ctx.walkGrid,
      ctx.npcs,
      this.slug,
    );

    if (this.waypoints.length === 0) {
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
      npc.sprite.x = this.currentTargetPixelX;
      npc.sprite.y = this.currentTargetPixelY;
      npc.tileX = this.waypoints[this.waypointIndex][0];
      npc.tileY = this.waypoints[this.waypointIndex][1];

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

  cleanup(): void {}
}

registerAction("pathfind_to_char", (args) => new PathfindToCharAction(args));
