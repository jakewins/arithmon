/**
 * Map registry — each entry describes a Tiled JSON map we ship and the
 * tileset images it needs. OverworldScene preloads every registered map
 * upfront so transition_teleport can swap between them without a separate
 * loading step.
 */
export interface TilesetAsset {
  /** Tileset `name` as it appears inside the map JSON. */
  name: string;
  /** Phaser texture key we register it under. */
  imageKey: string;
  /** Path passed to `this.load.image`. */
  imagePath: string;
}

export interface MapDef {
  /** Phaser cache key used for `tilemapTiledJSON`. */
  jsonKey: string;
  /** Path passed to `this.load.tilemapTiledJSON`. */
  jsonPath: string;
  tilesets: TilesetAsset[];
}

/** Tilesets used by cotton_town + the indoor set needed by player_house_bedroom. */
const CORE_CITY_AND_COUNTRY: TilesetAsset = {
  name: "core_city_and_country",
  imageKey: "core_city_and_country",
  imagePath: "assets/maps/core_city_and_country.png",
};
const CORE_OUTDOOR: TilesetAsset = {
  name: "core_outdoor",
  imageKey: "core_outdoor",
  imagePath: "assets/maps/core_outdoor.png",
};
const CORE_BUILDINGS: TilesetAsset = {
  name: "core_buildings",
  imageKey: "core_buildings",
  imagePath: "assets/maps/core_buildings.png",
};
// Shared between indoor and outdoor maps — the image filename has a space,
// so we use an underscored Phaser key but keep the JSON name with a space.
const CORE_SET_PIECES: TilesetAsset = {
  name: "core_set pieces",
  imageKey: "core_set_pieces",
  imagePath: "assets/maps/core_set pieces.png",
};
const CORE_INDOOR_FLOORS: TilesetAsset = {
  name: "core_indoor_floors",
  imageKey: "core_indoor_floors",
  imagePath: "assets/maps/core_indoor_floors.png",
};
const CORE_INDOOR_STAIRS: TilesetAsset = {
  name: "core_indoor_stairs",
  imageKey: "core_indoor_stairs",
  imagePath: "assets/maps/core_indoor_stairs.png",
};
const CORE_INDOOR_WALLS: TilesetAsset = {
  name: "core_indoor_walls",
  imageKey: "core_indoor_walls",
  imagePath: "assets/maps/core_indoor_walls.png",
};
const OCEANSET_OUTSIDE: TilesetAsset = {
  name: "oceanset_outside.tiles",
  imageKey: "oceanset_outside_tiles",
  imagePath: "assets/maps/oceanset_outside.tiles.png",
};

export const MAP_REGISTRY: Record<string, MapDef> = {
  cotton_town: {
    jsonKey: "map-cotton_town",
    jsonPath: "assets/maps/cotton_town.json",
    tilesets: [CORE_CITY_AND_COUNTRY, CORE_OUTDOOR, CORE_BUILDINGS, CORE_SET_PIECES],
  },
  player_house_bedroom: {
    jsonKey: "map-player_house_bedroom",
    jsonPath: "assets/maps/player_house_bedroom.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_STAIRS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
  },
  spyder_bedroom: {
    jsonKey: "map-spyder_bedroom",
    jsonPath: "assets/maps/spyder_bedroom.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_STAIRS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
  },
  spyder_downstairs: {
    jsonKey: "map-spyder_downstairs",
    jsonPath: "assets/maps/spyder_downstairs.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_STAIRS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
  },
  water_end_of_desert: {
    jsonKey: "map-water_end_of_desert",
    jsonPath: "assets/maps/water_end_of_desert.json",
    tilesets: [CORE_OUTDOOR, OCEANSET_OUTSIDE],
  },
};

export function getMapDef(mapKey: string): MapDef {
  const def = MAP_REGISTRY[mapKey];
  if (!def) {
    throw new Error(`Unknown map key: ${mapKey}`);
  }
  return def;
}

/** De-duplicated list of all tileset assets referenced by any registered map. */
export function allTilesetAssets(): TilesetAsset[] {
  const seen = new Set<string>();
  const out: TilesetAsset[] = [];
  for (const map of Object.values(MAP_REGISTRY)) {
    for (const tileset of map.tilesets) {
      if (seen.has(tileset.imageKey)) continue;
      seen.add(tileset.imageKey);
      out.push(tileset);
    }
  }
  return out;
}
