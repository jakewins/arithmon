import { describe, expect, it } from "vitest";
import { MAP_REGISTRY, allTilesetAssets, getMapDef } from "../game/data/maps";

describe("map registry", () => {
  it("contains spyder_cotton_town, player_house_bedroom, spyder_bedroom, and spyder_downstairs", () => {
    expect(MAP_REGISTRY.spyder_cotton_town).toBeDefined();
    expect(MAP_REGISTRY.player_house_bedroom).toBeDefined();
    expect(MAP_REGISTRY.spyder_bedroom).toBeDefined();
    expect(MAP_REGISTRY.spyder_downstairs).toBeDefined();
  });

  it("spyder_cotton_town has the correct tileset set", () => {
    const names = MAP_REGISTRY.spyder_cotton_town.tilesets.map((t) => t.name);
    expect(names).toEqual([
      "core_city_and_country",
      "core_buildings",
      "core_outdoor",
      "core_set pieces",
      "core_outdoor_nature",
    ]);
  });

  it("player_house_bedroom has the indoor tileset set plus shared set pieces", () => {
    const names = MAP_REGISTRY.player_house_bedroom.tilesets.map((t) => t.name);
    expect(names).toEqual([
      "core_indoor_floors",
      "core_indoor_stairs",
      "core_indoor_walls",
      "core_set pieces",
    ]);
  });

  it("getMapDef throws for unknown keys", () => {
    expect(() => getMapDef("not_a_map")).toThrow(/Unknown map key/);
  });

  it("allTilesetAssets de-duplicates the shared set-pieces tileset", () => {
    const keys = allTilesetAssets().map((t) => t.imageKey);
    const unique = new Set(keys);
    expect(keys.length).toBe(unique.size);
    expect(unique.has("core_set_pieces")).toBe(true);
  });
});
