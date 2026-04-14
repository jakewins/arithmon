/**
 * Generates a small starter map in Tiled JSON format.
 * Run with: npx tsx scripts/generate-starter-map.ts
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;
const TILE_SIZE = 16;

// Tile IDs from core_outdoor.png (37 columns wide, 1-indexed for Tiled)
// Row 0 of the tileset has grass/path tiles. Looking at the image:
// Tile 1 (top-left) = light grass
// Tiles in the first few rows are grass variants
const GRASS_TILES = [1, 2, 3, 4]; // A few grass variants from top-left of tileset
const FENCE_TILE = 187; // Horizontal fence piece (row 5, approximate)
const ROCK_TILE = 695; // Rock/stone tile

function randomGrass(): number {
  // Weighted: mostly tile 1, sometimes variants
  return Math.random() < 0.7 ? GRASS_TILES[0] : GRASS_TILES[Math.floor(Math.random() * GRASS_TILES.length)];
}

// Ground layer: all grass
const groundData: number[] = [];
for (let i = 0; i < MAP_WIDTH * MAP_HEIGHT; i++) {
  groundData.push(randomGrass());
}

// Collision layer: border of rocks, a few interior obstacles
const collisionData: number[] = new Array(MAP_WIDTH * MAP_HEIGHT).fill(0);

for (let x = 0; x < MAP_WIDTH; x++) {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const idx = y * MAP_WIDTH + x;
    // Border walls
    if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
      collisionData[idx] = FENCE_TILE;
    }
  }
}

// A few rocks in the interior
const rocks = [
  [5, 5], [6, 5], [10, 8], [10, 9], [14, 4],
];
for (const [x, y] of rocks) {
  collisionData[y * MAP_WIDTH + x] = ROCK_TILE;
}

const map = {
  compressionlevel: -1,
  height: MAP_HEIGHT,
  infinite: false,
  layers: [
    {
      data: groundData,
      height: MAP_HEIGHT,
      id: 1,
      name: "ground",
      opacity: 1,
      type: "tilelayer",
      visible: true,
      width: MAP_WIDTH,
      x: 0,
      y: 0,
    },
    {
      data: collisionData,
      height: MAP_HEIGHT,
      id: 2,
      name: "collision",
      opacity: 1,
      type: "tilelayer",
      visible: true,
      width: MAP_WIDTH,
      x: 0,
      y: 0,
    },
  ],
  nextlayerid: 3,
  nextobjectid: 1,
  orientation: "orthogonal",
  renderorder: "right-down",
  tiledversion: "1.10",
  tileheight: TILE_SIZE,
  tilesets: [
    {
      columns: 37,
      firstgid: 1,
      image: "core_outdoor.png",
      imageheight: 1200,
      imagewidth: 592,
      margin: 0,
      name: "core_outdoor",
      spacing: 0,
      tilecount: 2775,
      tileheight: TILE_SIZE,
      tilewidth: TILE_SIZE,
    },
  ],
  tilewidth: TILE_SIZE,
  type: "map",
  version: "1.10",
  width: MAP_WIDTH,
};

const outPath = join(__dirname, "..", "public", "assets", "maps", "starter.json");
writeFileSync(outPath, JSON.stringify(map, null, 2));
console.log(`Wrote ${outPath}`);
