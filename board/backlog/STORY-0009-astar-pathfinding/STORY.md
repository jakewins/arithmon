# STORY-0009: A* Pathfinding for NPC Movement

## Description

Upgrade the `pathfind` action from STORY-0008's straight-line movement to real A* pathfinding that avoids collision tiles. This lets Tuxemon scenarios "just work" even when the NPC path crosses walls, buildings, or other obstacles — the NPC will navigate around them automatically.

### Library choice

Use [`pathfinding`](https://github.com/qiao/PathFinding.js) (npm: `pathfinding`, `@types/pathfinding`). It's a mature, grid-based pathfinding library purpose-built for tile games. Only dependency is `heap` (tiny binary heap). Provides A*, Dijkstra, BFS, and Jump Point Search out of the box. We'll use `AStarFinder` with diagonal movement disabled (4-directional, matching Tuxemon).

Alternatives considered:
- `javascript-astar` — zero deps, but no TypeScript types and simpler API
- `easystarjs` — async-only API (designed for web workers), awkward for our synchronous per-frame event loop
- `astar-typescript` — TypeScript native but depends on lodash
- Hand-rolled — unnecessary when a well-tested library exists

### Design

1. **Walkability grid**: Built once per map from the collision layer. A 2D array where 0 = walkable, 1 = blocked. Also mark tiles occupied by NPCs as temporarily blocked (recalculated when pathfinding is requested).

2. **Integration point**: The `pathfind` action calls a shared pathfinding service instead of doing straight-line movement. The service returns a list of tile waypoints. The action walks the NPC tile-by-tile along the waypoints, same as STORY-0008's movement logic.

3. **Fallback**: If no path is found (NPC is boxed in), log a warning and complete the action immediately (don't block the event queue forever).

### Tasks

1. **Install `pathfinding` and `@types/pathfinding`**

2. **Build walkability grid** (`event/pathfinding.ts`)
   - Accept the Phaser tilemap collision objects (same ones used for player physics)
   - Convert to a 2D grid: iterate map tiles, mark any tile overlapping a collision rect as blocked
   - Expose `buildGrid(collisionRects, mapWidth, mapHeight, tileSize): PF.Grid`
   - Cache the grid per map (rebuild only on map change)

3. **Pathfinding service** (`event/pathfinding.ts`)
   - `findPath(fromTile, toTile, grid, npcs): [number, number][]`
   - Clone the cached grid, mark current NPC positions as blocked (except the moving NPC)
   - Run `AStarFinder` with `allowDiagonal: false`
   - Return the waypoint list (excluding the start tile)

4. **Upgrade `pathfind` action**
   - On `start()`: request path from the pathfinding service
   - Store waypoint queue, walk NPC tile-by-tile (reuse STORY-0008's per-tile movement logic)
   - On `update()`: move toward current waypoint, advance to next when reached
   - If path is empty (no route found), log warning and set `done = true`

5. **Pass collision data to EventContext**
   - Add the walkability grid (or the collision rects + map size) to `EventContext` so the pathfind action can access it
   - OverworldScene builds this once in `create()` and passes it through

6. **Tests**
   - `buildGrid`: collision rects produce correct blocked tiles
   - `findPath`: finds path around an obstacle
   - `findPath`: returns empty path when destination is unreachable
   - `findPath`: NPC-occupied tiles are avoided

## Acceptance Criteria

- [ ] `pathfind` action routes NPCs around collision tiles using A*
- [ ] NPCs don't walk through buildings or walls
- [ ] If no path exists, the action completes gracefully (no infinite block)
- [ ] Walkability grid is built from the existing collision layer (no manual tile marking)
- [ ] All existing STORY-0008 scenarios still work (regression)
- [ ] All code passes formatter, linter, typecheck, and tests
