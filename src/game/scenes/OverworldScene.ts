import { Scene } from "phaser";
import { Monster, getLeadMonster } from "../model/Monster";
import { EventEngine } from "../event/engine";
import { session } from "../session";
import { loadEventsFromYaml } from "../event/loader";
import type { Direction, EventContext, NpcState, PendingTeleport } from "../event/types";
import { getNpcSprite, allNpcSpritesheets, PLAYER_SPRITE_TEMPLATES } from "../data/npcs";
import { MAP_REGISTRY, allTilesetAssets, getMapDef } from "../data/maps";
import { getEncounterTable, rollEncounter } from "../data/encounters";
import { FACING_FRAMES } from "../event/actions/charFace";
import { loadPO } from "../i18n";
import { buildGrid, findPath, type CollisionRect } from "../event/pathfinding";
import type PF from "pathfinding";
import { debugBridge, type DebugCommandHandler, type DebugStateProvider } from "../debug";
import { updateSaveLocation, saveGame } from "../save";
import { consumeSavedLocation } from "../save";

const PLAYER_SPEED = 80;
const TILE_SIZE = 16;
/** Tall-grass tile IDs across different tilesets that trigger encounters. */
const GRASS_TILE_IDS = new Set([1552, 2797]);
import { getEncounterRate } from "../encounterConfig";

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

  // walkTo state
  private walkToWaypoints: [number, number][] = [];
  private walkToIndex = 0;
  private walkToTargetPixelX = 0;
  private walkToTargetPixelY = 0;
  private walkToFacing?: Direction;
  private walkToResolve?: () => void;

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
    this.load.text("events-cotton_town", "assets/events/cotton_town.yaml");
    this.load.text("events-spyder_bedroom", "assets/events/spyder_bedroom.yaml");
    this.load.text("events-spyder_downstairs", "assets/events/spyder_downstairs.yaml");
    this.load.text("events-spyder_healing_center", "assets/events/spyder_healing_center.yaml");
    this.load.text("events-spyder_paper_scoop", "assets/events/spyder_paper_scoop.yaml");
    this.load.text("events-spyder_route1", "assets/events/spyder_route1.yaml");
    this.load.text("events-spyder_paper_town", "assets/events/spyder_paper_town.yaml");
    this.load.text("events-spyder_cotton_scoop", "assets/events/spyder_cotton_scoop.yaml");

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

    // Character sprite for change_bg_char overlay (32×32 frames)
    this.load.spritesheet(
      "spyder_omnichannel_beaverbrook",
      "assets/sprites/spyder_omnichannel_beaverbrook.png",
      { frameWidth: 32, frameHeight: 32 },
    );

    // Monster battle sprites (64×44 frames)
    this.load.spritesheet("rockitten-battle", "assets/sprites/rockitten-sheet.png", {
      frameWidth: 64,
      frameHeight: 44,
    });
    for (const slug of [
      "dollfin",
      "ignibus",
      "memnomnom",
      "budaye",
      "grintot",
      "pairagrin",
      "aardorn",
      "cataspike",
      "cardiling",
      "eyenemy",
    ]) {
      this.load.spritesheet(`${slug}-battle`, `assets/sprites/battle/${slug}-sheet.png`, {
        frameWidth: 64,
        frameHeight: 44,
      });
    }

    // NPC spritesheets — same frame layout as player (16x32, 3 cols × 4 rows)
    for (const sheet of allNpcSpritesheets()) {
      this.load.spritesheet(sheet, `assets/sprites/${sheet}.png`, {
        frameWidth: 16,
        frameHeight: 32,
      });
    }
  }

  create() {
    // Initialize i18n from preloaded PO file
    const poText = this.cache.text.get("i18n-en") as string;
    if (poText) loadPO(poText);

    const mapDef = getMapDef(this.mapKey);
    const map = this.make.tilemap({ key: mapDef.jsonKey });

    const tilesets = mapDef.tilesets.map((t) => map.addTilesetImage(t.name, t.imageKey)!);

    // Create tile layers — pass all tilesets so any layer can use any tile.
    // A layer named "Above Player" (any case) draws above the player; a
    // layer named "Ground" is remembered for grass-encounter tile lookups.
    for (const layerData of map.layers) {
      const layer = map.createLayer(layerData.name, tilesets)!;
      if (layerData.name.toLowerCase() === "above player") {
        layer.setDepth(10);
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
    this.createWalkAnimation("walk-down", 0, playerTexture);
    this.createWalkAnimation("walk-left", 1, playerTexture);
    this.createWalkAnimation("walk-right", 2, playerTexture);
    this.createWalkAnimation("walk-up", 3, playerTexture);

    // Per-map NPCs: only cotton_town has the greeter for now.
    this.collisionBodies = this.physics.add.staticGroup();
    if (this.mapKey === "cotton_town") {
      this.spawnGreeter();
    }

    // Collision from object layer rectangles
    const collisionRects: CollisionRect[] = [];
    const collisionLayer = map.getObjectLayer("Collisions");
    if (collisionLayer) {
      for (const obj of collisionLayer.objects) {
        const rect = this.add.rectangle(
          obj.x! + obj.width! / 2,
          obj.y! + obj.height! / 2,
          obj.width,
          obj.height,
        );
        rect.setVisible(false);
        this.collisionBodies.add(rect);
        collisionRects.push({
          x: obj.x!,
          y: obj.y!,
          width: obj.width!,
          height: obj.height!,
        });
      }
    }
    this.physics.add.collider(this.player, this.collisionBodies);

    // Build walkability grid for A* pathfinding
    this.walkGrid = buildGrid(collisionRects, map.width, map.height, TILE_SIZE);

    // Camera
    const cam = this.cameras.main;
    if (map.widthInPixels >= cam.width && map.heightInPixels >= cam.height) {
      cam.startFollow(this.player, true);
      cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    } else {
      // Small map — lock camera to map centre so the room stays fixed on screen
      cam.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
    }
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

    // Auto-launch character selection on first load (new game)
    if (!session.player.gameVariables.has("scenario_choice")) {
      this.startCutscene();
    }
  }

  getDebugState(): Record<string, unknown> {
    const { tileX, tileY } = this.playerTile();
    return {
      player: {
        tileX,
        tileY,
        facing: this.playerFacing,
        pixelX: this.player.x,
        pixelY: this.player.y,
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

  private spawnGreeter() {
    const greeterTileX = 17;
    const greeterTileY = 18;
    const greeterX = greeterTileX * TILE_SIZE + TILE_SIZE / 2;
    const greeterY = greeterTileY * TILE_SIZE;
    const { spritesheet: greeterSheet } = getNpcSprite("greeter");
    const greeterSprite = this.add.sprite(greeterX, greeterY, greeterSheet, 1);
    greeterSprite.setDepth(5);
    this.npcs.set("greeter", {
      slug: "greeter",
      tileX: greeterTileX,
      tileY: greeterTileY,
      facing: "left",
      sprite: greeterSprite,
    });

    const npcBodyY = greeterTileY * TILE_SIZE + TILE_SIZE / 2;
    const npcCollision = this.add.rectangle(greeterX, npcBodyY, TILE_SIZE, TILE_SIZE);
    npcCollision.setVisible(false);
    this.collisionBodies.add(npcCollision);
  }

  private createWalkAnimation(key: string, row: number, textureKey: string) {
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

  update(_time: number, delta: number) {
    if (this.inCombat) return;

    const blocked = this.eventEngine.blocking || this.controlsState.locked;

    if (!blocked && !this.teleporting) {
      if (this.walkToActive) {
        // walkTo drives movement — suppress keyboard input
        this.updateWalkTo(delta / 1000);
      } else {
        this.player.setVelocity(0);

        if (this.cursors.left.isDown) {
          this.player.setVelocityX(-PLAYER_SPEED);
          this.player.anims.play("walk-left", true);
          this.playerFacing = "left";
        } else if (this.cursors.right.isDown) {
          this.player.setVelocityX(PLAYER_SPEED);
          this.player.anims.play("walk-right", true);
          this.playerFacing = "right";
        } else if (this.cursors.up.isDown) {
          this.player.setVelocityY(-PLAYER_SPEED);
          this.player.anims.play("walk-up", true);
          this.playerFacing = "up";
        } else if (this.cursors.down.isDown) {
          this.player.setVelocityY(PLAYER_SPEED);
          this.player.anims.play("walk-down", true);
          this.playerFacing = "down";
        } else {
          this.player.anims.stop();
        }
      }
    } else {
      this.player.setVelocity(0);
      this.player.anims.stop();
    }

    // Build event context — use body center for tile coords (body is at feet)
    const { tileX, tileY } = this.playerTile();
    const ctx: EventContext = {
      scene: this,
      session,
      player: { tileX, tileY, facing: this.playerFacing },
      variables: session.player.gameVariables,
      interactPressed: this.interactPressed,
      npcs: this.npcs,
      controls: this.controlsState,
      collisionBodies: this.collisionBodies,
      walkGrid: this.walkGrid,
      debugChoiceOverride: this.pendingChoiceOverride,
    };

    this.eventEngine.update(ctx, delta / 1000);

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

    if (!blocked && !this.teleporting) {
      this.checkEncounter();
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
      } satisfies OverworldInitData);
    });
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

  private checkEncounter() {
    const { tileX, tileY } = this.playerTile();

    // Only check on tile transitions
    if (tileX === this.lastTileX && tileY === this.lastTileY) return;
    debugBridge.emit("player_moved", {
      fromX: this.lastTileX,
      fromY: this.lastTileY,
      toX: tileX,
      toY: tileY,
    });
    this.lastTileX = tileX;
    this.lastTileY = tileY;

    const onGrass = this.tileLayers.some((layer) => {
      const tile = layer.getTileAt(tileX, tileY);
      return tile && GRASS_TILE_IDS.has(tile.index);
    });
    if (!onGrass) return;

    if (Math.random() >= getEncounterRate()) return;

    this.startCombat();
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

  private startCombat() {
    const lead = getLeadMonster(session.player.monsters);
    if (!lead) return; // no usable monsters

    this.inCombat = true;
    this.player.setVelocity(0);
    this.player.anims.stop();

    const table = getEncounterTable(this.mapKey);
    const { slug: enemySlug, level: enemyLevel } = rollEncounter(table);
    const enemyMonster = Monster.spawn(enemySlug, enemyLevel);
    debugBridge.emit("encounter_started", { monster: enemySlug, level: enemyLevel });

    this.scene.pause();
    this.scene.launch("CombatScene", {
      playerMonster: lead,
      enemyMonster,
      party: session.player.monsters,
      inventory: session.player.inventory,
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

  private triggerWhiteout() {
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
