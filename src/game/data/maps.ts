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
  /** Battle environment for this map (determines background + islands). */
  environment?: string;
  /** True for indoor/roofed maps (exempt from night tinting). */
  inside?: boolean;
  /** Map type tag for location conditions (e.g. "clinic", "shop", "town"). */
  locationType?: string;
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
const CORE_OUTDOOR_WATER: TilesetAsset = {
  name: "core_outdoor_water",
  imageKey: "core_outdoor_water",
  imagePath: "assets/maps/core_outdoor_water.png",
};
const CORE_OUTDOOR_NATURE: TilesetAsset = {
  name: "core_outdoor_nature",
  imageKey: "core_outdoor_nature",
  imagePath: "assets/maps/core_outdoor_nature.png",
};
const OCEANSET_OUTSIDE: TilesetAsset = {
  name: "oceanset_outside.tiles",
  imageKey: "oceanset_outside_tiles",
  imagePath: "assets/maps/oceanset_outside.tiles.png",
};

export const MAP_REGISTRY: Record<string, MapDef> = {
  starter: {
    jsonKey: "map-starter",
    jsonPath: "assets/maps/starter.json",
    tilesets: [CORE_OUTDOOR],
    environment: "grass",
  },
  cotton_town: {
    jsonKey: "map-cotton_town",
    jsonPath: "assets/maps/cotton_town.json",
    tilesets: [CORE_CITY_AND_COUNTRY, CORE_OUTDOOR, CORE_BUILDINGS, CORE_SET_PIECES],
    environment: "grass",
  },
  player_house_bedroom: {
    jsonKey: "map-player_house_bedroom",
    jsonPath: "assets/maps/player_house_bedroom.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_STAIRS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_bedroom: {
    jsonKey: "map-spyder_bedroom",
    jsonPath: "assets/maps/spyder_bedroom.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_STAIRS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_downstairs: {
    jsonKey: "map-spyder_downstairs",
    jsonPath: "assets/maps/spyder_downstairs.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_STAIRS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_paper_scoop: {
    jsonKey: "map-spyder_paper_scoop",
    jsonPath: "assets/maps/spyder_paper_scoop.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
    locationType: "shop",
  },
  spyder_paper_town: {
    jsonKey: "map-spyder_paper_town",
    jsonPath: "assets/maps/spyder_paper_town.json",
    tilesets: [
      CORE_CITY_AND_COUNTRY,
      CORE_OUTDOOR,
      CORE_SET_PIECES,
      CORE_BUILDINGS,
      CORE_OUTDOOR_WATER,
      CORE_OUTDOOR_NATURE,
    ],
    environment: "plain",
  },
  spyder_healing_center: {
    jsonKey: "map-spyder_healing_center",
    jsonPath: "assets/maps/spyder_healing_center.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
    locationType: "clinic",
  },
  spyder_cotton_scoop: {
    jsonKey: "map-spyder_cotton_scoop",
    jsonPath: "assets/maps/spyder_cotton_scoop.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
    locationType: "shop",
  },
  spyder_route1: {
    jsonKey: "map-spyder_route1",
    jsonPath: "assets/maps/spyder_route1.json",
    tilesets: [CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_WATER, CORE_OUTDOOR_NATURE],
    environment: "forest",
  },
  spyder_route2: {
    jsonKey: "map-spyder_route2",
    jsonPath: "assets/maps/spyder_route2.json",
    tilesets: [CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_WATER, CORE_OUTDOOR_NATURE],
    environment: "forest",
  },
  spyder_citypark: {
    jsonKey: "map-spyder_citypark",
    jsonPath: "assets/maps/spyder_citypark.json",
    tilesets: [
      CORE_OUTDOOR,
      CORE_SET_PIECES,
      CORE_OUTDOOR_WATER,
      CORE_OUTDOOR_NATURE,
      CORE_CITY_AND_COUNTRY,
    ],
    environment: "grass",
  },
  spyder_flower_city: {
    jsonKey: "map-spyder_flower_city",
    jsonPath: "assets/maps/spyder_flower_city.json",
    tilesets: [CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_WATER, CORE_OUTDOOR_NATURE],
    environment: "grass",
  },
  spyder_flower_center: {
    jsonKey: "map-spyder_flower_center",
    jsonPath: "assets/maps/spyder_flower_center.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
    locationType: "clinic",
  },
  spyder_flower_petshop: {
    jsonKey: "map-spyder_flower_petshop",
    jsonPath: "assets/maps/spyder_flower_petshop.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
    locationType: "shop",
  },
  spyder_flower_house1: {
    jsonKey: "map-spyder_flower_house1",
    jsonPath: "assets/maps/spyder_flower_house1.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_flower_house2: {
    jsonKey: "map-spyder_flower_house2",
    jsonPath: "assets/maps/spyder_flower_house2.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_flower_scoop: {
    jsonKey: "map-spyder_flower_scoop",
    jsonPath: "assets/maps/spyder_flower_scoop.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
    locationType: "shop",
  },
  spyder_dojo1: {
    jsonKey: "map-spyder_dojo1",
    jsonPath: "assets/maps/spyder_dojo1.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_dojo2: {
    jsonKey: "map-spyder_dojo2",
    jsonPath: "assets/maps/spyder_dojo2.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_dojo3: {
    jsonKey: "map-spyder_dojo3",
    jsonPath: "assets/maps/spyder_dojo3.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_dojo4: {
    jsonKey: "map-spyder_dojo4",
    jsonPath: "assets/maps/spyder_dojo4.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_route5: {
    jsonKey: "map-spyder_route5",
    jsonPath: "assets/maps/spyder_route5.json",
    tilesets: [CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_WATER, CORE_OUTDOOR_NATURE],
    environment: "forest",
  },
  spyder_route6: {
    jsonKey: "map-spyder_route6",
    jsonPath: "assets/maps/spyder_route6.json",
    tilesets: [CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_WATER, CORE_OUTDOOR_NATURE],
    environment: "forest",
  },
  spyder_leather_town: {
    jsonKey: "map-spyder_leather_town",
    jsonPath: "assets/maps/spyder_leather_town.json",
    tilesets: [CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_WATER, CORE_OUTDOOR_NATURE],
    environment: "grass",
  },
  spyder_leather_center: {
    jsonKey: "map-spyder_leather_center",
    jsonPath: "assets/maps/spyder_leather_center.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
    locationType: "clinic",
  },
  spyder_leather_gym: {
    jsonKey: "map-spyder_leather_gym",
    jsonPath: "assets/maps/spyder_leather_gym.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_leather_museum: {
    jsonKey: "map-spyder_leather_museum",
    jsonPath: "assets/maps/spyder_leather_museum.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_leather_shaft1: {
    jsonKey: "map-spyder_leather_shaft1",
    jsonPath: "assets/maps/spyder_leather_shaft1.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_leather_shaft2: {
    jsonKey: "map-spyder_leather_shaft2",
    jsonPath: "assets/maps/spyder_leather_shaft2.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_route4: {
    jsonKey: "map-spyder_route4",
    jsonPath: "assets/maps/spyder_route4.json",
    tilesets: [CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_WATER, CORE_OUTDOOR_NATURE],
    environment: "forest",
  },
  spyder_routeA: {
    jsonKey: "map-spyder_routeA",
    jsonPath: "assets/maps/spyder_routeA.json",
    tilesets: [CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_WATER, CORE_OUTDOOR_NATURE],
    environment: "forest",
  },
  spyder_timber_town: {
    jsonKey: "map-spyder_timber_town",
    jsonPath: "assets/maps/spyder_timber_town.json",
    tilesets: [CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_WATER, CORE_OUTDOOR_NATURE],
    environment: "grass",
  },
  spyder_timber_center: {
    jsonKey: "map-spyder_timber_center",
    jsonPath: "assets/maps/spyder_timber_center.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
    locationType: "clinic",
  },
  spyder_timber_cafe: {
    jsonKey: "map-spyder_timber_cafe",
    jsonPath: "assets/maps/spyder_timber_cafe.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_timber_scoop: {
    jsonKey: "map-spyder_timber_scoop",
    jsonPath: "assets/maps/spyder_timber_scoop.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
    locationType: "shop",
  },
  spyder_route3: {
    jsonKey: "map-spyder_route3",
    jsonPath: "assets/maps/spyder_route3.json",
    tilesets: [CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_WATER, CORE_OUTDOOR_NATURE],
    environment: "forest",
  },
  spyder_mansion: {
    jsonKey: "map-spyder_mansion",
    jsonPath: "assets/maps/spyder_mansion.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_mansion_basement: {
    jsonKey: "map-spyder_mansion_basement",
    jsonPath: "assets/maps/spyder_mansion_basement.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_mansion_top: {
    jsonKey: "map-spyder_mansion_top",
    jsonPath: "assets/maps/spyder_mansion_top.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_paper_manor: {
    jsonKey: "map-spyder_paper_manor",
    jsonPath: "assets/maps/spyder_paper_manor.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_paper_daycare: {
    jsonKey: "map-spyder_paper_daycare",
    jsonPath: "assets/maps/spyder_paper_daycare.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_paper_rival_downstairs: {
    jsonKey: "map-spyder_paper_rival_downstairs",
    jsonPath: "assets/maps/spyder_paper_rival_downstairs.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_paper_rival_bedroom: {
    jsonKey: "map-spyder_paper_rival_bedroom",
    jsonPath: "assets/maps/spyder_paper_rival_bedroom.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  spyder_paper_rival_office: {
    jsonKey: "map-spyder_paper_rival_office",
    jsonPath: "assets/maps/spyder_paper_rival_office.json",
    tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
    environment: "grass",
    inside: true,
  },
  water_end_of_desert: {
    jsonKey: "map-water_end_of_desert",
    jsonPath: "assets/maps/water_end_of_desert.json",
    tilesets: [CORE_OUTDOOR, OCEANSET_OUTSIDE],
    environment: "ocean",
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
