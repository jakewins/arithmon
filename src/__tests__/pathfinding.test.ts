import { describe, it, expect } from "vitest";
import {
  buildGrid,
  findPath,
  type CollisionRect,
  type DirectionalGrid,
} from "../game/event/pathfinding";
import type { NpcState } from "../game/event/types";

const TILE_SIZE = 16;

describe("buildGrid", () => {
  it("marks tiles overlapping collision rects as blocked", () => {
    // 5x5 grid with a wall at tiles (2,1) and (2,2)
    const rects: CollisionRect[] = [
      { x: 2 * TILE_SIZE, y: 1 * TILE_SIZE, width: TILE_SIZE, height: 2 * TILE_SIZE },
    ];
    const grid = buildGrid(rects, 5, 5, TILE_SIZE);

    // Blocked tiles
    expect(grid.isWalkableAt(2, 1)).toBe(false);
    expect(grid.isWalkableAt(2, 2)).toBe(false);

    // Surrounding tiles should be walkable
    expect(grid.isWalkableAt(1, 1)).toBe(true);
    expect(grid.isWalkableAt(3, 1)).toBe(true);
    expect(grid.isWalkableAt(2, 0)).toBe(true);
    expect(grid.isWalkableAt(2, 3)).toBe(true);
  });

  it("handles rects not aligned to tile boundaries", () => {
    // A rect that spans from pixel (10, 10) to (30, 30) — covers tiles (0,0), (0,1), (1,0), (1,1)
    const rects: CollisionRect[] = [{ x: 10, y: 10, width: 20, height: 20 }];
    const grid = buildGrid(rects, 4, 4, TILE_SIZE);

    expect(grid.isWalkableAt(0, 0)).toBe(false);
    expect(grid.isWalkableAt(1, 0)).toBe(false);
    expect(grid.isWalkableAt(0, 1)).toBe(false);
    expect(grid.isWalkableAt(1, 1)).toBe(false);
    expect(grid.isWalkableAt(2, 0)).toBe(true);
    expect(grid.isWalkableAt(0, 2)).toBe(true);
  });
});

describe("findPath", () => {
  it("finds a path around an obstacle", () => {
    // 5x5 grid, wall blocking column 2 rows 0-3
    const rects: CollisionRect[] = [
      { x: 2 * TILE_SIZE, y: 0, width: TILE_SIZE, height: 4 * TILE_SIZE },
    ];
    const grid = buildGrid(rects, 5, 5, TILE_SIZE);
    const npcs = new Map<string, NpcState>();

    // Path from (0,2) to (4,2) must go around the wall via row 4
    const path = findPath({ x: 0, y: 2 }, { x: 4, y: 2 }, grid, npcs, "test_npc");

    expect(path.length).toBeGreaterThan(0);
    // End tile should be the destination
    expect(path[path.length - 1]).toEqual([4, 2]);
    // No waypoint should be on a blocked tile
    for (const [px, py] of path) {
      expect(grid.isWalkableAt(px, py)).toBe(true);
    }
  });

  it("returns empty path when destination is unreachable", () => {
    // 5x5 grid, completely wall off the destination at (4,4)
    const rects: CollisionRect[] = [
      { x: 3 * TILE_SIZE, y: 3 * TILE_SIZE, width: TILE_SIZE, height: 2 * TILE_SIZE },
      { x: 4 * TILE_SIZE, y: 3 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE },
    ];
    const grid = buildGrid(rects, 5, 5, TILE_SIZE);
    const npcs = new Map<string, NpcState>();

    const path = findPath({ x: 0, y: 0 }, { x: 4, y: 4 }, grid, npcs, "test_npc");
    expect(path).toEqual([]);
  });

  it("avoids NPC-occupied tiles", () => {
    // 3x3 grid, no walls. NPC blocking the direct path at (1,0).
    const grid = buildGrid([], 3, 3, TILE_SIZE);
    const npcs = new Map<string, NpcState>();
    npcs.set("blocker", {
      slug: "blocker",
      tileX: 1,
      tileY: 0,
      facing: "down",
      sprite: {} as Phaser.GameObjects.Sprite,
    });

    // Path from (0,0) to (2,0) — direct route blocked by NPC at (1,0)
    const path = findPath({ x: 0, y: 0 }, { x: 2, y: 0 }, grid, npcs, "mover");

    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual([2, 0]);
    // Should not pass through the blocker's tile
    for (const [px, py] of path) {
      expect(px === 1 && py === 0).toBe(false);
    }
  });

  it("does not block the moving NPC's own tile", () => {
    // 3x1 grid, NPC "mover" is at (0,0), moving to (2,0)
    const grid = buildGrid([], 3, 1, TILE_SIZE);
    const npcs = new Map<string, NpcState>();
    npcs.set("mover", {
      slug: "mover",
      tileX: 0,
      tileY: 0,
      facing: "right",
      sprite: {} as Phaser.GameObjects.Sprite,
    });

    const path = findPath({ x: 0, y: 0 }, { x: 2, y: 0 }, grid, npcs, "mover");
    expect(path).toEqual([
      [1, 0],
      [2, 0],
    ]);
  });

  /*
   * Directional ("doormat") tile handling — regression cover for STORY-0207.
   *
   * Doors / stairs / fences are marked unwalkable in the base grid because
   * free-roam movement enforces enter_from / exit_from via isDirectionBlocked
   * rather than via the A* grid. Scripted `pathfind player,...` actions
   * (e.g. the kick-out in spyder_omnichannel1) need to land on those tiles
   * when the approach matches, matching upstream Tuxemon's direction-aware
   * pathfinder. findPath does that by re-opening directional tiles in its
   * working grid clone, then validating each transition.
   */
  describe("directional-grid handling", () => {
    it("walks onto a doormat tile when approach matches enter_from", () => {
      // 3x3 grid; door at (1,2) is enter_from=up only, marked unwalkable in
      // the base grid (mirrors what OverworldScene does for directional tiles).
      const grid = buildGrid([], 3, 3, TILE_SIZE);
      grid.setWalkableAt(1, 2, false);
      const dirGrid: DirectionalGrid = new Map([
        ["1,2", { enter_from: ["up"], exit_from: ["up"] }],
      ]);
      const npcs = new Map<string, NpcState>();

      const path = findPath({ x: 1, y: 1 }, { x: 1, y: 2 }, grid, npcs, "p", dirGrid);
      expect(path).toEqual([[1, 2]]);
    });

    it("returns no path when approach direction is blocked by enter_from", () => {
      // Door at (1,2) only allows entry from above; trying to reach it from
      // the side should fail even though the tile is geometrically adjacent.
      const grid = buildGrid([], 3, 3, TILE_SIZE);
      // Force the only available approach to come from the left so A* can't
      // route around to the top.
      grid.setWalkableAt(1, 1, false);
      grid.setWalkableAt(1, 2, false);
      const dirGrid: DirectionalGrid = new Map([
        ["1,2", { enter_from: ["up"], exit_from: ["up"] }],
      ]);
      const npcs = new Map<string, NpcState>();

      const path = findPath({ x: 0, y: 2 }, { x: 1, y: 2 }, grid, npcs, "p", dirGrid);
      expect(path).toEqual([]);
    });

    it("leaves non-directional paths unaffected", () => {
      // Without a directionalGrid the function behaves exactly as before:
      // unwalkable tiles stay unwalkable.
      const grid = buildGrid([], 3, 3, TILE_SIZE);
      grid.setWalkableAt(1, 1, false);
      const npcs = new Map<string, NpcState>();

      const path = findPath({ x: 0, y: 0 }, { x: 2, y: 2 }, grid, npcs, "p");
      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1]).toEqual([2, 2]);
      // Must not include the blocked tile.
      for (const [x, y] of path) {
        expect(x === 1 && y === 1).toBe(false);
      }
    });
  });
});
