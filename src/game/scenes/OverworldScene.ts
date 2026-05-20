import { Scene } from "phaser";
import { Monster, getLeadMonster } from "../model/Monster";
import { EventEngine } from "../event/engine";
import { session } from "../session";
import { loadEventsFromYaml } from "../event/loader";
import type {
  Direction,
  EventAction,
  EventContext,
  NpcState,
  PendingTeleport,
} from "../event/types";
import { createAction } from "../event/registry";
import {
  allNpcSpritesheets,
  allAnimatedNpcSpritesheets,
  PLAYER_SPRITE_TEMPLATES,
  registerNpcSprite,
} from "../data/npcs";
import { MAP_REGISTRY, allTilesetAssets, getMapDef } from "../data/maps";
import { MONSTERS } from "../data/monsters";
import { getEncounterTable, rollEncounter } from "../data/encounters";
import { FACING_FRAMES } from "../event/actions/charFace";
import { loadPO } from "../i18n";
import { buildGrid, findPath, type CollisionRect } from "../event/pathfinding";
import type PF from "pathfinding";
import { debugBridge, type DebugCommandHandler, type DebugStateProvider } from "../debug";
import { updateSaveLocation, saveGame } from "../save";
import { consumeSavedLocation } from "../save";
import blockedTileSets, { directionalTileSets, type AllowedDirs } from "../data/blockedTiles";

const PLAYER_SPEED = 80;
const TILE_SIZE = 16;

const DEFAULT_MAP = "starter";
const DEFAULT_SPAWN = { tileX: 10, tileY: 7, facing: "down" as Direction };

export interface OverworldInitData {
  mapKey?: string;
  spawnTileX?: number;
  spawnTileY?: number;
  spawnFacing?: Direction;
}

export class OverworldScene extends Scene implements DebugStateProvider, DebugCommandHandler {
  // Exposed so char_face action can update player sprite frame
  player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private collisionBodies!: Phaser.Physics.Arcade.StaticGroup;
  private tileLayers: (Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer)[] = [];
  private lastTileX = -1;
  private lastTileY = -1;
  private inCombat = false;
  private playerFacing: Direction = "down";
  private interactPressed = false;
  private eventEngine!: EventEngine;
  private npcs = new Map<string, NpcState>();
  private controlsState: { locked: boolean; pendingTeleport?: PendingTeleport } = {
    locked: false,
  };
  private mapKey = DEFAULT_MAP;
  private spawnTileX = DEFAULT_SPAWN.tileX;
  private spawnTileY = DEFAULT_SPAWN.tileY;
  private spawnFacing: Direction = DEFAULT_SPAWN.facing;
  private teleporting = false;
  private walkGrid?: PF.Grid;
  private pendingChoiceOverride?: number;
  /** Debug-only actions ticked by the scene update loop. Each resolves on done. */
  private debugActions: { action: EventAction; resolve: () => void }[] = [];
  /** Per-tile directional restrictions keyed by "x,y" → AllowedDirs. */
  private directionalGrid = new Map<string, AllowedDirs>();

  // walkTo state
  private walkToWaypoints: [number, number][] = [];
  private walkToIndex = 0;
  private walkToTargetPixelX = 0;
  private walkToTargetPixelY = 0;
  private walkToFacing?: Direction;
  private walkToResolve?: () => void;

  // walkStep state (single-tile keyboard-style movement for debug/tests)
  private walkStepDir?: Direction;
  private walkStepStartTile?: { tileX: number; tileY: number };
  private walkStepResolve?: (result: { tileX: number; tileY: number }) => void;

  constructor() {
    super("OverworldScene");
  }

  init(data: OverworldInitData = {}) {
    // On first boot, check for a saved location to resume from
    const saved = consumeSavedLocation();
    this.mapKey = data.mapKey ?? saved?.mapKey ?? DEFAULT_MAP;
    this.spawnTileX = data.spawnTileX ?? saved?.tileX ?? DEFAULT_SPAWN.tileX;
    this.spawnTileY = data.spawnTileY ?? saved?.tileY ?? DEFAULT_SPAWN.tileY;
    this.spawnFacing = data.spawnFacing ?? (saved?.facing as Direction) ?? DEFAULT_SPAWN.facing;
    updateSaveLocation(this.mapKey, this.spawnTileX, this.spawnTileY, this.spawnFacing);
    saveGame();
    this.teleporting = false;
    this.inCombat = false;
    this.interactPressed = false;
    this.npcs = new Map<string, NpcState>();
    this.controlsState = { locked: false };
    this.lastTileX = -1;
    this.lastTileY = -1;
    this.tileLayers = [];
    this.walkToWaypoints = [];
    this.walkToResolve = undefined;
    this.walkStepDir = undefined;
    this.walkStepResolve = undefined;
  }

  preload() {
    // Preload every registered map + its tilesets so teleports don't need
    // a separate loading step.
    for (const def of Object.values(MAP_REGISTRY)) {
      this.load.tilemapTiledJSON(def.jsonKey, def.jsonPath);
    }
    for (const tileset of allTilesetAssets()) {
      this.load.image(tileset.imageKey, tileset.imagePath);
    }

    // Player sprite templates — all share the same 16×32 frame layout
    for (const template of PLAYER_SPRITE_TEMPLATES) {
      this.load.spritesheet(template, `assets/sprites/${template}.png`, {
        frameWidth: 16,
        frameHeight: 32,
      });
    }
    // Per-map event files — keyed by map name
    this.load.text("events-spyder_bedroom", "assets/events/spyder_bedroom.yaml");
    this.load.text("events-spyder_downstairs", "assets/events/spyder_downstairs.yaml");
    this.load.text("events-spyder_healing_center", "assets/events/spyder_healing_center.yaml");
    this.load.text("events-spyder_paper_scoop", "assets/events/spyder_paper_scoop.yaml");
    this.load.text("events-spyder_route1", "assets/events/spyder_route1.yaml");
    this.load.text("events-spyder_paper_town", "assets/events/spyder_paper_town.yaml");
    this.load.text("events-spyder_cotton_scoop", "assets/events/spyder_cotton_scoop.yaml");
    this.load.text("events-spyder_paper_manor", "assets/events/spyder_paper_manor.yaml");
    this.load.text("events-spyder_paper_daycare", "assets/events/spyder_paper_daycare.yaml");
    this.load.text(
      "events-spyder_paper_rival_downstairs",
      "assets/events/spyder_paper_rival_downstairs.yaml",
    );
    this.load.text(
      "events-spyder_paper_rival_bedroom",
      "assets/events/spyder_paper_rival_bedroom.yaml",
    );
    this.load.text(
      "events-spyder_paper_rival_office",
      "assets/events/spyder_paper_rival_office.yaml",
    );
    this.load.text("events-spyder_route2", "assets/events/spyder_route2.yaml");
    this.load.text("events-spyder_citypark", "assets/events/spyder_citypark.yaml");
    this.load.text("events-spyder_route3", "assets/events/spyder_route3.yaml");
    this.load.text("events-spyder_mansion", "assets/events/spyder_mansion.yaml");
    this.load.text("events-spyder_mansion_basement", "assets/events/spyder_mansion_basement.yaml");
    this.load.text("events-spyder_mansion_top", "assets/events/spyder_mansion_top.yaml");
    this.load.text("events-spyder_route4", "assets/events/spyder_route4.yaml");
    this.load.text("events-spyder_routeA", "assets/events/spyder_routeA.yaml");
    this.load.text("events-spyder_timber_town", "assets/events/spyder_timber_town.yaml");
    this.load.text("events-spyder_timber_center", "assets/events/spyder_timber_center.yaml");
    this.load.text("events-spyder_timber_cafe", "assets/events/spyder_timber_cafe.yaml");
    this.load.text("events-spyder_timber_scoop", "assets/events/spyder_timber_scoop.yaml");
    this.load.text("events-spyder_route5", "assets/events/spyder_route5.yaml");
    this.load.text("events-spyder_route6", "assets/events/spyder_route6.yaml");
    this.load.text("events-spyder_leather_town", "assets/events/spyder_leather_town.yaml");
    this.load.text("events-spyder_leather_center", "assets/events/spyder_leather_center.yaml");
    this.load.text("events-spyder_leather_gym", "assets/events/spyder_leather_gym.yaml");
    this.load.text("events-spyder_leather_museum", "assets/events/spyder_leather_museum.yaml");
    this.load.text("events-spyder_leather_shaft1", "assets/events/spyder_leather_shaft1.yaml");
    this.load.text("events-spyder_leather_shaft2", "assets/events/spyder_leather_shaft2.yaml");
    this.load.text("events-spyder_flower_city", "assets/events/spyder_flower_city.yaml");
    this.load.text("events-spyder_flower_center", "assets/events/spyder_flower_center.yaml");
    this.load.text("events-spyder_flower_petshop", "assets/events/spyder_flower_petshop.yaml");
    this.load.text("events-spyder_flower_house1", "assets/events/spyder_flower_house1.yaml");
    this.load.text("events-spyder_flower_house2", "assets/events/spyder_flower_house2.yaml");
    this.load.text("events-spyder_flower_scoop", "assets/events/spyder_flower_scoop.yaml");
    this.load.text("events-spyder_dojo1", "assets/events/spyder_dojo1.yaml");
    this.load.text("events-spyder_dojo2", "assets/events/spyder_dojo2.yaml");
    this.load.text("events-spyder_dojo3", "assets/events/spyder_dojo3.yaml");
    this.load.text("events-spyder_dojo4", "assets/events/spyder_dojo4.yaml");
    this.load.text("events-spyder_candy_town", "assets/events/spyder_candy_town.yaml");
    this.load.text("events-spyder_candy_port", "assets/events/spyder_candy_port.yaml");
    this.load.text("events-spyder_candy_inn1", "assets/events/spyder_candy_inn1.yaml");
    this.load.text("events-spyder_candy_inn2", "assets/events/spyder_candy_inn2.yaml");
    this.load.text("events-spyder_candy_cafe", "assets/events/spyder_candy_cafe.yaml");
    this.load.text("events-spyder_candy_center", "assets/events/spyder_candy_center.yaml");
    this.load.text("events-spyder_candy_hospital1", "assets/events/spyder_candy_hospital1.yaml");
    this.load.text("events-spyder_candy_hospital2", "assets/events/spyder_candy_hospital2.yaml");
    this.load.text("events-spyder_candy_hospital3", "assets/events/spyder_candy_hospital3.yaml");
    this.load.text("events-spyder_greenwash", "assets/events/spyder_greenwash.yaml");
    this.load.text("events-spyder_greenwash_level2", "assets/events/spyder_greenwash_level2.yaml");
    this.load.text("events-spyder_greenwash_level3", "assets/events/spyder_greenwash_level3.yaml");
    this.load.text(
      "events-spyder_greenwash_greenhouse",
      "assets/events/spyder_greenwash_greenhouse.yaml",
    );
    this.load.text("events-spyder_cotton_town", "assets/events/spyder_cotton_town.yaml");
    this.load.text("events-spyder_cotton_house1", "assets/events/spyder_cotton_house1.yaml");
    this.load.text("events-spyder_cotton_house2", "assets/events/spyder_cotton_house2.yaml");
    this.load.text("events-spyder_cotton_cafe", "assets/events/spyder_cotton_cafe.yaml");
    this.load.text("events-spyder_cotton_artshop", "assets/events/spyder_cotton_artshop.yaml");
    this.load.text("events-spyder_cotton_tunnel", "assets/events/spyder_cotton_tunnel.yaml");
    this.load.text("events-spyder_omnichannel1", "assets/events/spyder_omnichannel1.yaml");
    this.load.text("events-spyder_dragons_cave", "assets/events/spyder_dragons_cave.yaml");
    this.load.text("events-spyder_dryads_grove", "assets/events/spyder_dryads_grove.yaml");
    this.load.text("events-spyder_nimrod_bottom", "assets/events/spyder_nimrod_bottom.yaml");
    this.load.text("events-spyder_nimrod_middle", "assets/events/spyder_nimrod_middle.yaml");
    this.load.text("events-spyder_nimrod_top", "assets/events/spyder_nimrod_top.yaml");
    this.load.text("events-spyder_nimrod_room", "assets/events/spyder_nimrod_room.yaml");
    this.load.text("events-spyder_datacenter", "assets/events/spyder_datacenter.yaml");
    this.load.text("events-spyder_routeB", "assets/events/spyder_routeB.yaml");
    this.load.text("events-spyder_routeC", "assets/events/spyder_routeC.yaml");
    this.load.text("events-spyder_diamond_hill", "assets/events/spyder_diamond_hill.yaml");

    this.load.text("start-tuxemon", "assets/events/start_tuxemon.yaml");

    // i18n translations
    this.load.text("i18n-en", "assets/l10n/en_US.po");

    // Dialog box nine-slice border
    this.load.image("dialog-border", "assets/ui/dialog-border.png");

    // Background images used by change_bg image overlay
    this.load.image("choice_gender", "assets/ui/background/choice_gender.png");
    this.load.image("spyder_tumble", "assets/ui/background/spyder_tumble.png");
    this.load.image("spyder_monsters", "assets/ui/background/spyder_monsters.png");
    this.load.image("spyder_morph", "assets/ui/background/spyder_morph.png");

    // Monster battle sprites (64×44 frames)
    this.load.spritesheet("rockitten-battle", "assets/sprites/rockitten-sheet.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    for (const slug of Object.keys(MONSTERS)) {
      this.load.spritesheet(`${slug}-battle`, `assets/sprites/battle/${slug}-sheet.png`, {
        frameWidth: 64,
        frameHeight: 64,
      });
    }

    // NPC spritesheets — walking sprites are 16x32 (3 cols × 4 rows); static
    // props can override frame dimensions via NpcSpriteDef.
    for (const sheet of allNpcSpritesheets()) {
      this.load.spritesheet(sheet.name, `assets/sprites/${sheet.name}.png`, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
  }

  create() {
    // Initialize i18n from preloaded PO file
    const poText = this.cache.text.get("i18n-en") as string;
    if (poText) loadPO(poText);

    const mapDef = getMapDef(this.mapKey);
    session.mapKey = this.mapKey;
    session.environment = mapDef.environment ?? "grass";
    session.inside = mapDef.inside ?? false;
    session.locationType = mapDef.locationType ?? "";
    const map = this.make.tilemap({ key: mapDef.jsonKey });

    const tilesets = mapDef.tilesets.map((t) => map.addTilesetImage(t.name, t.imageKey)!);

    // Compute the set of global tile IDs (GIDs) that are impassable, by
    // combining each tileset's firstgid with the per-tileset blocked-tile
    // lookup extracted from the original Tuxemon .tsx files.
    const blockedGids: number[] = [];
    for (const ts of mapDef.tilesets) {
      const localIds = blockedTileSets.get(ts.name);
      if (!localIds) continue;
      const phaserTs = map.tilesets.find((t) => t.name === ts.name);
      if (!phaserTs) continue;
      const firstgid = phaserTs.firstgid;
      for (const id of localIds) {
        blockedGids.push(firstgid + id);
      }
    }

    // Create tile layers — pass all tilesets so any layer can use any tile.
    // A layer named "Above Player" (any case) draws above the player; a
    // layer named "Ground" is remembered for grass-encounter tile lookups.
    for (const layerData of map.layers) {
      const layer = map.createLayer(layerData.name, tilesets)!;
      if (layerData.name.toLowerCase() === "above player") {
        layer.setDepth(10);
      }
      // Mark blocked tiles as collidable so Phaser physics stops the player.
      if (blockedGids.length > 0) {
        layer.setCollision(blockedGids);
      }
      this.tileLayers.push(layer);
    }

    // Player — use the session template to pick the spritesheet
    const playerTexture = session.player.template;
    const startX = this.spawnTileX * TILE_SIZE + TILE_SIZE / 2;
    const startY = this.spawnTileY * TILE_SIZE;
    this.playerFacing = this.spawnFacing;
    this.player = this.physics.add.sprite(
      startX,
      startY,
      playerTexture,
      FACING_FRAMES[this.spawnFacing],
    );
    this.player.setSize(12, 12);
    this.player.setOffset(2, 18);
    this.player.setDepth(5);

    // Walk animations — keyed to the current texture
    this.createDirectionalWalkAnims("walk", playerTexture);

    // NPC walk anims — one set per spritesheet, keyed npc-walk-{sheet}-{dir}.
    for (const sheet of allAnimatedNpcSpritesheets()) {
      this.createDirectionalWalkAnims(`npc-walk-${sheet}`, sheet);
    }

    this.collisionBodies = this.physics.add.staticGroup();

    // Build per-tile directional restriction lookup first — tiles with
    // directional properties are managed by the directional system and should
    // NOT be covered by collision-rect physics bodies (matching Tuxemon
    // behaviour where directional tile rules override collision zones).
    const dirGidMap = new Map<number, AllowedDirs>();
    for (const ts of mapDef.tilesets) {
      const dirLocal = directionalTileSets.get(ts.name);
      if (!dirLocal) continue;
      const phaserTs = map.tilesets.find((t) => t.name === ts.name);
      if (!phaserTs) continue;
      const firstgid = phaserTs.firstgid;
      for (const [localId, dirs] of dirLocal) {
        dirGidMap.set(firstgid + localId, dirs);
      }
    }
    this.directionalGrid = new Map<string, AllowedDirs>();
    const directionalTileCoords = new Set<string>();
    if (dirGidMap.size > 0) {
      for (const layer of this.tileLayers) {
        for (let ty = 0; ty < map.height; ty++) {
          for (let tx = 0; tx < map.width; tx++) {
            const tile = layer.getTileAt(tx, ty);
            if (tile && dirGidMap.has(tile.index)) {
              const key = `${tx},${ty}`;
              directionalTileCoords.add(key);
              const existing = this.directionalGrid.get(key);
              const incoming = dirGidMap.get(tile.index)!;
              if (existing) {
                // Merge: use the most restrictive (intersection of allowed dirs)
                const mergedEnter =
                  existing.enter_from && incoming.enter_from
                    ? existing.enter_from.filter((d) => incoming.enter_from!.includes(d))
                    : (existing.enter_from ?? incoming.enter_from);
                const mergedExit =
                  existing.exit_from && incoming.exit_from
                    ? existing.exit_from.filter((d) => incoming.exit_from!.includes(d))
                    : (existing.exit_from ?? incoming.exit_from);
                this.directionalGrid.set(key, {
                  ...(mergedEnter ? { enter_from: mergedEnter } : {}),
                  ...(mergedExit ? { exit_from: mergedExit } : {}),
                });
              } else {
                this.directionalGrid.set(key, incoming);
              }
            }
          }
        }
      }
    }

    // Compute "approach tiles" — non-directional tiles adjacent to
    // directional tiles from which entry is allowed.  These must remain
    // walkable so the player can stand right next to fences / ledges,
    // matching Tuxemon's tile-based collision where directional rules
    // override collision zones.  We only mark non-directional tiles as
    // approach tiles so that directional tiles don't remove each other's
    // collision bodies.
    const approachTileCoords = new Set<string>();
    for (const [key] of this.directionalGrid) {
      const [tx, ty] = key.split(",").map(Number);
      // Mark all four neighbours as approach tiles so the player can
      // walk right up to the fence/ledge from any side.  The
      // directional enter_from / exit_from checks will still prevent
      // crossing onto the tile from a disallowed direction.
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const akey = `${tx + dx},${ty + dy}`;
        if (!directionalTileCoords.has(akey)) {
          approachTileCoords.add(akey);
        }
      }
    }

    // Collision from object layer rectangles — exclude approach tiles so the
    // player can walk right up to directional boundaries (fences / ledges).
    const collisionRects: CollisionRect[] = [];
    const collisionLayer = map.getObjectLayer("Collisions");
    if (collisionLayer) {
      for (const obj of collisionLayer.objects) {
        collisionRects.push({
          x: obj.x!,
          y: obj.y!,
          width: obj.width!,
          height: obj.height!,
        });
        // Create per-tile collision bodies, skipping approach tiles and
        // directional tiles.  Directional tiles (fences, ledges) are
        // handled by the isDirectionBlocked() check, not physics bodies.
        const startCol = Math.floor(obj.x! / TILE_SIZE);
        const endCol = Math.ceil((obj.x! + obj.width!) / TILE_SIZE);
        const startRow = Math.floor(obj.y! / TILE_SIZE);
        const endRow = Math.ceil((obj.y! + obj.height!) / TILE_SIZE);
        for (let ty = startRow; ty < endRow; ty++) {
          for (let tx = startCol; tx < endCol; tx++) {
            const key = `${tx},${ty}`;
            if (approachTileCoords.has(key) || directionalTileCoords.has(key)) continue;
            const rect = this.add.rectangle(
              tx * TILE_SIZE + TILE_SIZE / 2,
              ty * TILE_SIZE + TILE_SIZE / 2,
              TILE_SIZE,
              TILE_SIZE,
            );
            rect.setVisible(false);
            this.collisionBodies.add(rect);
          }
        }
      }
    }
    this.physics.add.collider(this.player, this.collisionBodies);

    // Add physics collider between player and each tile layer so that tiles
    // marked with setCollision() above actually stop the player.
    for (const layer of this.tileLayers) {
      this.physics.add.collider(this.player, layer);
    }

    // Build walkability grid for A* pathfinding.
    // Also mark tile-based blocked tiles so A* pathfinding respects them.
    this.walkGrid = buildGrid(collisionRects, map.width, map.height, TILE_SIZE);
    const blockedGidSet = new Set(blockedGids);
    for (const layer of this.tileLayers) {
      for (let ty = 0; ty < map.height; ty++) {
        for (let tx = 0; tx < map.width; tx++) {
          const tile = layer.getTileAt(tx, ty);
          if (tile && blockedGidSet.has(tile.index)) {
            this.walkGrid.setWalkableAt(tx, ty, false);
          }
        }
      }
    }
    // Mark directionally-restricted tiles as unwalkable for A*
    for (const key of directionalTileCoords) {
      const [tx, ty] = key.split(",").map(Number);
      this.walkGrid.setWalkableAt(tx, ty, false);
    }
    // Re-mark approach tiles as walkable (buildGrid may have blocked them
    // because they fall inside a collision rect).
    for (const key of approachTileCoords) {
      const [tx, ty] = key.split(",").map(Number);
      if (tx >= 0 && ty >= 0 && tx < map.width && ty < map.height) {
        this.walkGrid.setWalkableAt(tx, ty, true);
      }
    }

    // Camera: always follow the player, matching upstream Tuxemon's behaviour
    // (upstream/tuxemon/camera/camera.py). `setBounds` clamps scroll at map
    // edges; for maps smaller than the viewport in some dimension Phaser
    // anchors the map flush against the clamped edge and fills the rest of
    // the viewport with the camera background colour (black, set below).
    const cam = this.cameras.main;
    cam.startFollow(this.player, true);
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.player.setCollideWorldBounds(true);

    // Reset background colour (change_bg* sets it during cutscenes) and fade in
    this.cameras.main.setBackgroundColor(0x000000);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();

    this.input.keyboard!.on("keydown-SPACE", () => {
      this.interactPressed = true;
    });

    this.input.keyboard!.on("keydown-Z", () => {
      this.interactPressed = true;
    });

    // Debug: press C to force a combat encounter
    this.input.keyboard!.on("keydown-C", () => {
      if (!this.inCombat) this.startCombat();
    });

    // Debug: press P to launch a math problem
    this.input.keyboard!.on("keydown-P", () => {
      if (!this.inCombat) this.startMathProblem();
    });

    // Debug: press V to launch a sample cutscene
    this.input.keyboard!.on("keydown-V", () => {
      if (!this.inCombat) this.startCutscene();
    });

    // Pause menu
    this.input.keyboard!.on("keydown-ESC", () => {
      if (
        !this.inCombat &&
        !this.eventEngine.blocking &&
        !this.controlsState.locked &&
        !this.teleporting
      ) {
        this.player.setVelocity(0);
        this.player.anims.stop();
        this.scene.pause();
        this.scene.launch("PauseMenuScene");
      }
    });

    // Event engine — load per-map YAML events by naming convention
    const eventsYaml = this.cache.text.get(`events-${this.mapKey}`) as string | undefined;
    const events = eventsYaml ? loadEventsFromYaml(eventsYaml) : [];
    this.eventEngine = new EventEngine(events);

    debugBridge.setScene(this);
    debugBridge.emit("scene_started", { scene: "OverworldScene" });

    this.events.on("resume", () => {
      debugBridge.setScene(this);
    });

    this.events.once("shutdown", () => {
      debugBridge.emit("scene_stopped", { scene: "OverworldScene" });
    });

    // Note: we used to auto-launch CutsceneScene/start_tuxemon.yaml here for
    // brand-new players, but STORY-0194 moved that handoff to TitleScene's
    // "New Game" button (which now pre-sets scenario/gender/race and teleports
    // straight to spyder_bedroom). start_tuxemon.yaml is still in the repo,
    // it's just unreachable from the new boot path. STORY-0198 will remove it.
  }

  getDebugState(): Record<string, unknown> {
    const { tileX, tileY } = this.playerTile();
    const cam = this.cameras.main;
    return {
      mapKey: this.mapKey,
      player: {
        tileX,
        tileY,
        facing: this.playerFacing,
        pixelX: this.player.x,
        pixelY: this.player.y,
        texture: this.player.texture.key,
      },
      // Exposed for the indoor-camera-follow QA harness (STORY-0209) to assert
      // the player tile is inside the visible viewport. Cheap to include.
      camera: {
        scrollX: cam.scrollX,
        scrollY: cam.scrollY,
        width: cam.width,
        height: cam.height,
      },
      npcs: [...this.npcs.values()].map((npc) => ({
        slug: npc.slug,
        tileX: npc.tileX,
        tileY: npc.tileY,
        facing: npc.facing,
      })),
      blocking: this.eventEngine.blocking || this.controlsState.locked,
    };
  }

  // --- DebugCommandHandler ---

  debugSetInteract(): void {
    this.interactPressed = true;
  }

  debugFace(direction: Direction): void {
    this.playerFacing = direction;
    this.player.setVelocity(0);
    this.player.anims.stop();
    this.player.setFrame(FACING_FRAMES[direction]);
  }

  debugSelectChoice(index: number): void {
    this.pendingChoiceOverride = index;
  }

  debugIsBlocking(): boolean {
    return this.eventEngine.blocking || this.controlsState.locked;
  }

  debugWalkTo(tileX: number, tileY: number, facing?: Direction): Promise<void> {
    // Reject if a walk is already in progress
    if (this.walkToResolve) {
      return Promise.reject(new Error("walkTo already in progress"));
    }

    const { tileX: px, tileY: py } = this.playerTile();

    // Already there
    if (px === tileX && py === tileY) {
      if (facing) this.debugFace(facing);
      return Promise.resolve();
    }

    if (!this.walkGrid) {
      return Promise.reject(new Error("walkTo: no walkability grid available"));
    }

    const waypoints = findPath(
      { x: px, y: py },
      { x: tileX, y: tileY },
      this.walkGrid,
      this.npcs,
      "__player__",
      this.directionalGrid,
    );

    if (waypoints.length === 0) {
      return Promise.reject(new Error(`walkTo: no path from (${px},${py}) to (${tileX},${tileY})`));
    }

    this.walkToWaypoints = waypoints;
    this.walkToIndex = 0;
    this.walkToFacing = facing;
    this.setWalkToTarget();

    return new Promise<void>((resolve) => {
      this.walkToResolve = resolve;
    });
  }

  private get walkToActive(): boolean {
    return this.walkToResolve !== undefined;
  }

  private setWalkToTarget(): void {
    const [tx, ty] = this.walkToWaypoints[this.walkToIndex];
    this.walkToTargetPixelX = tx * TILE_SIZE + TILE_SIZE / 2;
    this.walkToTargetPixelY = ty * TILE_SIZE;
  }

  private finishWalkTo(): void {
    if (this.walkToFacing) {
      this.debugFace(this.walkToFacing);
    } else {
      this.player.setVelocity(0);
      this.player.anims.stop();
    }
    const resolve = this.walkToResolve;
    this.walkToResolve = undefined;
    this.walkToWaypoints = [];
    resolve?.();
  }

  private updateWalkTo(dt: number): void {
    const dx = this.walkToTargetPixelX - this.player.x;
    const dy = this.walkToTargetPixelY - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = PLAYER_SPEED * dt;

    // Update facing and animation based on direction to target
    let dir: Direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? "right" : "left";
    } else {
      dir = dy > 0 ? "down" : "up";
    }
    if (dir !== this.playerFacing) {
      this.playerFacing = dir;
    }
    this.player.anims.play(`walk-${dir}`, true);

    if (step >= dist || dist < 1) {
      // Snap to waypoint
      this.player.setPosition(this.walkToTargetPixelX, this.walkToTargetPixelY);
      this.player.setVelocity(0);

      this.walkToIndex++;
      if (this.walkToIndex >= this.walkToWaypoints.length) {
        this.finishWalkTo();
        return;
      }

      this.setWalkToTarget();
    } else {
      // Move toward target using velocity (physics will move the sprite)
      const vx = (dx / dist) * PLAYER_SPEED;
      const vy = (dy / dist) * PLAYER_SPEED;
      this.player.setVelocity(vx, vy);
    }
  }

  // --- walkStep: move exactly 1 tile via the normal input code path ---

  debugWalkStep(dir: Direction): Promise<{ tileX: number; tileY: number }> {
    if (this.walkStepResolve) {
      return Promise.reject(new Error("walkStep already in progress"));
    }
    this.walkStepDir = dir;
    this.walkStepStartTile = this.playerTile();
    this.playerFacing = dir;
    return new Promise((resolve) => {
      this.walkStepResolve = resolve;
    });
  }

  private updateWalkStep(): void {
    const dir = this.walkStepDir!;
    this.player.setVelocity(0);

    // Use the same directional check as keyboard input
    if (!this.isDirectionBlocked(dir)) {
      if (dir === "left") this.player.setVelocityX(-PLAYER_SPEED);
      else if (dir === "right") this.player.setVelocityX(PLAYER_SPEED);
      else if (dir === "up") this.player.setVelocityY(-PLAYER_SPEED);
      else if (dir === "down") this.player.setVelocityY(PLAYER_SPEED);
      this.player.anims.play(`walk-${dir}`, true);
    }

    const cur = this.playerTile();
    const moved =
      cur.tileX !== this.walkStepStartTile!.tileX || cur.tileY !== this.walkStepStartTile!.tileY;
    const stuck = this.isDirectionBlocked(dir);

    if (moved || stuck) {
      // Snap to the nearest tile center to avoid sub-pixel drift.
      if (moved) {
        this.player.setPosition(cur.tileX * TILE_SIZE + TILE_SIZE / 2, cur.tileY * TILE_SIZE);
      }
      this.player.setVelocity(0);
      this.player.anims.stop();
      const resolve = this.walkStepResolve;
      this.walkStepDir = undefined;
      this.walkStepStartTile = undefined;
      this.walkStepResolve = undefined;
      resolve?.(this.playerTile());
    }
  }

  private createDirectionalWalkAnims(keyPrefix: string, textureKey: string) {
    const rows: ReadonlyArray<[Direction, number]> = [
      ["down", 0],
      ["left", 1],
      ["right", 2],
      ["up", 3],
    ];
    for (const [dir, row] of rows) {
      const key = `${keyPrefix}-${dir}`;
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: [
          { key: textureKey, frame: row * 3 + 0 },
          { key: textureKey, frame: row * 3 + 1 },
          { key: textureKey, frame: row * 3 + 2 },
          { key: textureKey, frame: row * 3 + 1 },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  update(_time: number, delta: number) {
    if (this.inCombat) return;

    const blocked = this.eventEngine.blocking || this.controlsState.locked;

    // If a cutscene grabs control mid-walkTo / walkStep (e.g. paper_town's
    // "Stop!" blocker locks controls the same frame the player enters the
    // trigger zone), resolve the pending promise so callers don't deadlock.
    // The cutscene's pathfind drives the player from here.
    if (blocked && this.walkToActive) {
      this.walkToWaypoints = [];
      const resolve = this.walkToResolve;
      this.walkToResolve = undefined;
      resolve?.();
    }
    if (blocked && this.walkStepResolve) {
      const resolve = this.walkStepResolve;
      this.walkStepDir = undefined;
      this.walkStepStartTile = undefined;
      this.walkStepResolve = undefined;
      this.player.setVelocity(0);
      this.player.anims.stop();
      resolve(this.playerTile());
    }

    if (!blocked && !this.teleporting) {
      if (this.walkStepDir) {
        // walkStep: single-tile keyboard-style movement for debug/tests.
        this.updateWalkStep();
      } else if (this.walkToActive) {
        // walkTo drives movement — suppress keyboard input
        this.updateWalkTo(delta / 1000);
      } else {
        this.player.setVelocity(0);

        if (this.cursors.left.isDown && !this.isDirectionBlocked("left")) {
          this.player.setVelocityX(-PLAYER_SPEED);
          this.player.anims.play("walk-left", true);
          this.playerFacing = "left";
        } else if (this.cursors.right.isDown && !this.isDirectionBlocked("right")) {
          this.player.setVelocityX(PLAYER_SPEED);
          this.player.anims.play("walk-right", true);
          this.playerFacing = "right";
        } else if (this.cursors.up.isDown && !this.isDirectionBlocked("up")) {
          this.player.setVelocityY(-PLAYER_SPEED);
          this.player.anims.play("walk-up", true);
          this.playerFacing = "up";
        } else if (this.cursors.down.isDown && !this.isDirectionBlocked("down")) {
          this.player.setVelocityY(PLAYER_SPEED);
          this.player.anims.play("walk-down", true);
          this.playerFacing = "down";
        } else {
          // Still update facing even when directionally blocked
          if (this.cursors.left.isDown) this.playerFacing = "left";
          else if (this.cursors.right.isDown) this.playerFacing = "right";
          else if (this.cursors.up.isDown) this.playerFacing = "up";
          else if (this.cursors.down.isDown) this.playerFacing = "down";
          this.player.anims.stop();
          // Snap to nearest tile center so a 1–2 px physics overshoot
          // doesn't put the direction check on the wrong tile next frame.
          this.snapToTileCenter();
        }
      }
    } else {
      this.player.setVelocity(0);
      this.player.anims.stop();
    }

    // Build event context — use body center for tile coords (body is at feet)
    const { tileX, tileY } = this.playerTile();
    const moved = tileX !== this.lastTileX || tileY !== this.lastTileY;
    if (moved) {
      debugBridge.emit("player_moved", {
        fromX: this.lastTileX,
        fromY: this.lastTileY,
        toX: tileX,
        toY: tileY,
      });
      this.lastTileX = tileX;
      this.lastTileY = tileY;
    }
    const ctx: EventContext = {
      scene: this,
      session,
      player: { tileX, tileY, facing: this.playerFacing },
      playerSprite: this.player,
      variables: session.player.gameVariables,
      interactPressed: this.interactPressed,
      playerMoved: moved,
      npcs: this.npcs,
      controls: this.controlsState,
      collisionBodies: this.collisionBodies,
      walkGrid: this.walkGrid,
      directionalGrid: this.directionalGrid,
      debugChoiceOverride: this.pendingChoiceOverride,
      addEvents: (events) => this.eventEngine.mergeEvents(events),
    };

    this.eventEngine.update(ctx, delta / 1000);

    // Tick any debug-driven actions (e.g. QA-spawned pathfind_to_char)
    if (this.debugActions.length > 0) {
      const dtSec = delta / 1000;
      this.debugActions = this.debugActions.filter((entry) => {
        entry.action.update(ctx, dtSec);
        if (entry.action.done) {
          entry.action.cleanup(ctx);
          entry.resolve();
          return false;
        }
        return true;
      });
    }

    // Sync facing back from context (char_face action may have changed it)
    this.playerFacing = ctx.player.facing;

    // Clear per-frame input
    this.interactPressed = false;
    this.pendingChoiceOverride = undefined;

    // Teleport request from an action (e.g. transition_teleport)?
    if (this.controlsState.pendingTeleport && !this.teleporting) {
      this.beginTeleport(this.controlsState.pendingTeleport);
      this.controlsState.pendingTeleport = undefined;
    }
  }

  private beginTeleport(teleport: PendingTeleport) {
    this.teleporting = true;
    this.player.setVelocity(0);
    this.player.anims.stop();

    const durationMs = Math.max(1, Math.round(teleport.duration * 1000));
    this.cameras.main.fadeOut(durationMs, 0, 0, 0);
    // Use the scene timer rather than the camera event — see CutsceneScene.beginTeleport.
    this.time.delayedCall(durationMs, () => {
      this.scene.restart({
        mapKey: teleport.mapKey,
        spawnTileX: teleport.tileX,
        spawnTileY: teleport.tileY,
        spawnFacing: teleport.facing,
      } satisfies OverworldInitData);
    });
  }

  /**
   * Check whether the player can move in the given direction based on
   * directional enter_from / exit_from restrictions on tiles.
   *
   * Moving "right" means the player enters the target tile from "left",
   * and exits the current tile toward "right".
   */
  private isDirectionBlocked(dir: Direction): boolean {
    // Compute the "settled" tile: the tile whose center the player's body
    // has passed in the movement direction.  floor() transitions at tile
    // boundaries (the top/left edge) while the player "arrives" at a tile
    // when reaching its center.  Use floor for increasing-coordinate
    // movement and ceil for decreasing so the transition fires at the
    // center in both cases.
    //
    // Coordinate conventions:
    //   player.x = tileX * TILE_SIZE + TILE_SIZE/2  (tile center)
    //   player.y = tileY * TILE_SIZE                 (tile top)
    const tileX =
      dir === "left"
        ? Math.ceil((this.player.x - TILE_SIZE / 2) / TILE_SIZE)
        : Math.floor((this.player.x - TILE_SIZE / 2) / TILE_SIZE);
    const tileY =
      dir === "up" ? Math.ceil(this.player.y / TILE_SIZE) : Math.floor(this.player.y / TILE_SIZE);
    // The direction the target tile is "entered from" is the opposite of movement.
    const enterDir: Direction =
      dir === "left" ? "right" : dir === "right" ? "left" : dir === "up" ? "down" : "up";
    const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
    const targetX = tileX + dx;
    const targetY = tileY + dy;

    // Check: can we EXIT the current tile in this direction?
    const currentDirs = this.directionalGrid.get(`${tileX},${tileY}`);
    if (currentDirs?.exit_from && !currentDirs.exit_from.includes(dir)) {
      return true; // exit not allowed in this direction
    }

    // Check: can we ENTER the target tile from our direction?
    const targetDirs = this.directionalGrid.get(`${targetX},${targetY}`);
    if (targetDirs?.enter_from && !targetDirs.enter_from.includes(enterDir)) {
      return true; // entry not allowed from this direction
    }

    return false;
  }

  /** Snap position to the nearest tile center if within a few pixels. */
  private snapToTileCenter() {
    const nearX = Math.round((this.player.x - TILE_SIZE / 2) / TILE_SIZE);
    const nearY = Math.round(this.player.y / TILE_SIZE);
    const cx = nearX * TILE_SIZE + TILE_SIZE / 2;
    const cy = nearY * TILE_SIZE;
    if (Math.abs(this.player.x - cx) < 3) this.player.x = cx;
    if (Math.abs(this.player.y - cy) < 3) this.player.y = cy;
  }

  /** Player tile based on physics body center (at feet, not sprite center). */
  private playerTile() {
    // Body offset (2, 18), size (12, 12) → body center is (player.x, player.y + 8)
    const bodyCenterY = this.player.y + 8;
    return {
      tileX: Math.floor(this.player.x / TILE_SIZE),
      tileY: Math.floor(bodyCenterY / TILE_SIZE),
    };
  }

  private startMathProblem() {
    this.inCombat = true; // reuse flag to block other interactions
    this.player.setVelocity(0);
    this.player.anims.stop();

    this.scene.pause();
    this.scene.launch("MathProblemScene");

    this.scene.get("MathProblemScene").events.once("shutdown", () => {
      this.inCombat = false;
    });
  }

  private startCutscene() {
    this.inCombat = true;
    this.player.setVelocity(0);
    this.player.anims.stop();

    this.scene.pause();
    this.scene.launch("CutsceneScene", {
      yamlKey: "start-tuxemon",
      callerScene: "OverworldScene",
    });

    this.scene.get("CutsceneScene").events.once("shutdown", () => {
      this.inCombat = false;
    });
  }

  debugStartCombat(): void {
    this.startCombat();
  }

  debugSpawnBattle(
    playerSlug: string,
    enemySlug: string,
    playerLevel = 5,
    enemyLevel = 5,
    environment?: string,
  ): void {
    const playerMonster = Monster.spawn(playerSlug, playerLevel);
    const enemyMonster = Monster.spawn(enemySlug, enemyLevel);

    this.inCombat = true;
    this.player.setVelocity(0);
    this.player.anims.stop();

    this.scene.pause();
    this.scene.launch("CombatScene", {
      playerMonster,
      enemyMonster,
      party: [playerMonster],
      inventory: session.player.inventory,
      environment,
    });

    this.scene.get("CombatScene").events.once("shutdown", () => {
      this.inCombat = false;
    });
  }

  debugSpawnNpc(
    slug: string,
    spritesheet: string,
    tileX: number,
    tileY: number,
    facing: Direction = "down",
  ): void {
    registerNpcSprite(slug, { spritesheet });
    const action = createAction("create_npc", [slug, String(tileX), String(tileY), facing]);
    action.start(this.buildDebugContext());
  }

  debugPathfindNpc(slug: string, target: string): Promise<void> {
    return new Promise((resolve) => {
      const action = createAction("pathfind_to_char", [slug, target]);
      action.start(this.buildDebugContext());
      if (action.done) {
        resolve();
        return;
      }
      this.debugActions.push({ action, resolve });
    });
  }

  debugFaceNpc(slug: string, direction: Direction): void {
    const action = createAction("char_face", [slug, direction]);
    action.start(this.buildDebugContext());
  }

  debugRemoveNpc(slug: string): boolean {
    const npc = this.npcs.get(slug);
    if (!npc) return false;
    npc.sprite.destroy();
    npc.collisionBody?.destroy();
    this.npcs.delete(slug);
    return true;
  }

  debugSetPlayerVisible(visible: boolean): void {
    this.player.setVisible(visible);
  }

  private buildDebugContext(): EventContext {
    const { tileX, tileY } = this.playerTile();
    return {
      scene: this,
      session,
      player: { tileX, tileY, facing: this.playerFacing },
      playerSprite: this.player,
      variables: session.player.gameVariables,
      interactPressed: false,
      playerMoved: false,
      npcs: this.npcs,
      controls: this.controlsState,
      collisionBodies: this.collisionBodies,
      walkGrid: this.walkGrid,
      directionalGrid: this.directionalGrid,
      addEvents: (events) => this.eventEngine.mergeEvents(events),
    };
  }

  private startCombat() {
    const lead = getLeadMonster(session.player.monsters);
    if (!lead) return; // no usable monsters

    const table = getEncounterTable(this.mapKey);
    if (!table) return; // no encounters on this map

    this.inCombat = true;
    this.player.setVelocity(0);
    this.player.anims.stop();

    const { slug: enemySlug, level: enemyLevel } = rollEncounter(table);
    const enemyMonster = Monster.spawn(enemySlug, enemyLevel);
    debugBridge.emit("encounter_started", { monster: enemySlug, level: enemyLevel });

    this.scene.pause();
    const mapDef = getMapDef(this.mapKey);
    this.scene.launch("CombatScene", {
      playerMonster: lead,
      enemyMonster,
      party: session.player.monsters,
      inventory: session.player.inventory,
      environment: mapDef.environment,
    });

    // Listen for combat scene to stop, then handle post-combat
    this.scene.get("CombatScene").events.once("shutdown", () => {
      this.inCombat = false;

      // Check for whiteout — all party monsters fainted
      const allFainted = session.player.monsters.every((m) => m.fainted);
      if (allFainted) {
        this.triggerWhiteout();
      }
    });
  }

  triggerWhiteout() {
    // Heal all party monsters to full
    for (const m of session.player.monsters) {
      m.currentHp = m.maxHp;
    }

    // Teleport to faint location if set
    const ft = session.faintTeleport;
    if (ft) {
      this.scene.restart({
        mapKey: ft.mapKey,
        spawnTileX: ft.tileX,
        spawnTileY: ft.tileY,
      } satisfies OverworldInitData);
    }
  }
}
