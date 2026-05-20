import PF from "pathfinding";
import type { NpcState } from "./types";
import type { AllowedDirs } from "../data/blockedTiles";

export interface CollisionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DirectionalGrid = Map<string, AllowedDirs>;

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
 *
 * If `directionalGrid` is supplied, directional ("doormat") tiles — marked
 * unwalkable in the base grid so free-roam movement uses isDirectionBlocked
 * for them — are re-opened for A* and the resulting path is validated step by
 * step against each tile's enter_from / exit_from constraints. This lets
 * scripted `pathfind player,...` actions walk onto doorway tiles (matching
 * upstream Tuxemon's direction-aware pathfinder in tuxemon/movement.py).
 */
export function findPath(
  fromTile: { x: number; y: number },
  toTile: { x: number; y: number },
  grid: PF.Grid,
  npcs: Map<string, NpcState>,
  movingNpcSlug: string,
  directionalGrid?: DirectionalGrid,
): [number, number][] {
  // Clone the grid so we don't mutate the cached version
  const workingGrid = grid.clone();

  // Re-open directional tiles so A* can traverse them; we validate transitions
  // against enter_from / exit_from after the path is found.
  if (directionalGrid) {
    for (const key of directionalGrid.keys()) {
      const [tx, ty] = key.split(",").map(Number);
      if (tx >= 0 && ty >= 0 && tx < workingGrid.width && ty < workingGrid.height) {
        workingGrid.setWalkableAt(tx, ty, true);
      }
    }
  }

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
  const waypoints = rawPath.slice(1) as [number, number][];

  if (directionalGrid && !isPathDirectionallyValid(rawPath, directionalGrid)) {
    return [];
  }

  return waypoints;
}

/**
 * Walk each adjacent pair in `path`; reject the path if any transition
 * violates the source tile's exit_from or the destination tile's enter_from.
 */
function isPathDirectionallyValid(path: number[][], directionalGrid: DirectionalGrid): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const [fx, fy] = path[i];
    const [tx, ty] = path[i + 1];
    const dx = tx - fx;
    const dy = ty - fy;
    const moveDir = dx === 1 ? "right" : dx === -1 ? "left" : dy === 1 ? "down" : "up";
    const enterDir =
      moveDir === "left"
        ? "right"
        : moveDir === "right"
          ? "left"
          : moveDir === "up"
            ? "down"
            : "up";

    const fromDirs = directionalGrid.get(`${fx},${fy}`);
    if (fromDirs?.exit_from && !fromDirs.exit_from.includes(moveDir)) return false;

    const toDirs = directionalGrid.get(`${tx},${ty}`);
    if (toDirs?.enter_from && !toDirs.enter_from.includes(enterDir)) return false;
  }
  return true;
}
