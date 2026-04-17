import PF from "pathfinding";
import type { NpcState } from "./types";

export interface CollisionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Build a walkability grid from collision rectangles.
 * Tiles overlapping any collision rect are marked as blocked (1).
 */
export function buildGrid(
  collisionRects: CollisionRect[],
  mapWidth: number,
  mapHeight: number,
  tileSize: number,
): PF.Grid {
  const grid = new PF.Grid(mapWidth, mapHeight);

  for (const rect of collisionRects) {
    const startCol = Math.floor(rect.x / tileSize);
    const startRow = Math.floor(rect.y / tileSize);
    const endCol = Math.ceil((rect.x + rect.width) / tileSize);
    const endRow = Math.ceil((rect.y + rect.height) / tileSize);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        if (col >= 0 && col < mapWidth && row >= 0 && row < mapHeight) {
          grid.setWalkableAt(col, row, false);
        }
      }
    }
  }

  return grid;
}

/**
 * Find a path from one tile to another, avoiding obstacles and other NPCs.
 * Returns waypoints (excluding the start tile), or an empty array if no path exists.
 */
export function findPath(
  fromTile: { x: number; y: number },
  toTile: { x: number; y: number },
  grid: PF.Grid,
  npcs: Map<string, NpcState>,
  movingNpcSlug: string,
): [number, number][] {
  // Clone the grid so we don't mutate the cached version
  const workingGrid = grid.clone();

  // Mark NPC-occupied tiles as blocked (except the moving NPC)
  for (const [slug, npc] of npcs) {
    if (slug !== movingNpcSlug) {
      workingGrid.setWalkableAt(npc.tileX, npc.tileY, false);
    }
  }

  const finder = new PF.AStarFinder({
    allowDiagonal: false,
  });

  const rawPath = finder.findPath(fromTile.x, fromTile.y, toTile.x, toTile.y, workingGrid);

  // Remove the start tile from the path
  return rawPath.slice(1) as [number, number][];
}
