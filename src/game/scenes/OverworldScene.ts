import { Scene } from "phaser";
import { Monster } from "../model/Monster";
import { EventEngine } from "../event/engine";
import { session } from "../session";
import { loadEventsFromYaml } from "../event/loader";
import type { Direction, EventContext, NpcState, PendingTeleport } from "../event/types";
import { getNpcSprite, allNpcSpritesheets } from "../data/npcs";
import { MAP_REGISTRY, allTilesetAssets, getMapDef } from "../data/maps";
import { FACING_FRAMES } from "../event/actions/charFace";

const PLAYER_SPEED = 80;
const TILE_SIZE = 16;
const GRASS_TILE_ID = 1552;
const ENCOUNTER_RATE = 0.5;

const DEFAULT_MAP = "cotton_town";
const DEFAULT_SPAWN = { tileX: 20, tileY: 19, facing: "down" as Direction };

export interface OverworldInitData {
  mapKey?: string;
  spawnTileX?: number;
  spawnTileY?: number;
  spawnFacing?: Direction;
}

export class OverworldScene extends Scene {
  // Exposed so char_face action can update player sprite frame
  player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private collisionBodies!: Phaser.Physics.Arcade.StaticGroup;
  private groundLayer?: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
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

  constructor() {
    super("OverworldScene");
  }

  init(data: OverworldInitData = {}) {
    this.mapKey = data.mapKey ?? DEFAULT_MAP;
    this.spawnTileX = data.spawnTileX ?? DEFAULT_SPAWN.tileX;
    this.spawnTileY = data.spawnTileY ?? DEFAULT_SPAWN.tileY;
    this.spawnFacing = data.spawnFacing ?? DEFAULT_SPAWN.facing;
    this.teleporting = false;
    this.inCombat = false;
    this.interactPressed = false;
    this.npcs = new Map<string, NpcState>();
    this.controlsState = { locked: false };
    this.lastTileX = -1;
    this.lastTileY = -1;
    this.groundLayer = undefined;
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

    this.load.spritesheet("player", "assets/sprites/adventurer.png", {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.load.text("cotton-town-events", "assets/events/cotton_town.yaml");
    this.load.text("sample-cutscene", "assets/events/sample_cutscene.yaml");

    // NPC spritesheets — same frame layout as player (16x32, 3 cols × 4 rows)
    for (const sheet of allNpcSpritesheets()) {
      this.load.spritesheet(sheet, `assets/sprites/${sheet}.png`, {
        frameWidth: 16,
        frameHeight: 32,
      });
    }
  }

  create() {
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
      if (layerData.name === "Ground") {
        this.groundLayer = layer;
      }
    }

    // Player
    const startX = this.spawnTileX * TILE_SIZE + TILE_SIZE / 2;
    const startY = this.spawnTileY * TILE_SIZE;
    this.playerFacing = this.spawnFacing;
    this.player = this.physics.add.sprite(
      startX,
      startY,
      "player",
      FACING_FRAMES[this.spawnFacing],
    );
    this.player.setSize(12, 12);
    this.player.setOffset(2, 18);
    this.player.setDepth(5);

    // Walk animations
    this.createWalkAnimation("walk-down", 0);
    this.createWalkAnimation("walk-left", 1);
    this.createWalkAnimation("walk-right", 2);
    this.createWalkAnimation("walk-up", 3);

    // Per-map NPCs: only cotton_town has the greeter for now.
    this.collisionBodies = this.physics.add.staticGroup();
    if (this.mapKey === "cotton_town") {
      this.spawnGreeter();
    }

    // Collision from object layer rectangles
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
      }
    }
    this.physics.add.collider(this.player, this.collisionBodies);

    // Camera
    this.cameras.main.startFollow(this.player, true);
    const cam = this.cameras.main;
    // Only constrain the camera when the map is at least as large as the
    // viewport.  For small maps (e.g. indoor rooms) we skip bounds so the
    // camera can centre on the player instead of pinning to the top-left.
    if (map.widthInPixels >= cam.width && map.heightInPixels >= cam.height) {
      cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    }
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.player.setCollideWorldBounds(true);

    // Fade in — matches the fade-out done during teleport
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

    // Event engine — only cotton_town has scripted events today.
    const eventsYaml =
      this.mapKey === "cotton_town" ? (this.cache.text.get("cotton-town-events") as string) : "";
    const events = eventsYaml ? loadEventsFromYaml(eventsYaml) : [];
    this.eventEngine = new EventEngine(events);
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

  private createWalkAnimation(key: string, row: number) {
    this.anims.create({
      key,
      frames: [
        { key: "player", frame: row * 3 + 0 },
        { key: "player", frame: row * 3 + 1 },
        { key: "player", frame: row * 3 + 2 },
        { key: "player", frame: row * 3 + 1 },
      ],
      frameRate: 8,
      repeat: -1,
    });
  }

  update(_time: number, delta: number) {
    if (this.inCombat) return;

    const blocked = this.eventEngine.blocking || this.controlsState.locked;

    if (!blocked && !this.teleporting) {
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
    };

    this.eventEngine.update(ctx, delta / 1000);

    // Sync facing back from context (char_face action may have changed it)
    this.playerFacing = ctx.player.facing;

    // Clear per-frame input
    this.interactPressed = false;

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
    this.lastTileX = tileX;
    this.lastTileY = tileY;

    const tile = this.groundLayer?.getTileAt(tileX, tileY);
    if (!tile || tile.index !== GRASS_TILE_ID) return;

    if (Math.random() >= ENCOUNTER_RATE) return;

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
      yamlKey: "sample-cutscene",
      callerScene: "OverworldScene",
    });

    this.scene.get("CutsceneScene").events.once("shutdown", () => {
      this.inCombat = false;
    });
  }

  private startCombat() {
    this.inCombat = true;
    this.player.setVelocity(0);
    this.player.anims.stop();

    const playerMonster = Monster.spawn("rockitten", 5);
    const enemyMonster = Monster.spawn("rockitten", 4 + Math.floor(Math.random() * 3));

    this.scene.pause();
    this.scene.launch("CombatScene", { playerMonster, enemyMonster });

    // Listen for combat scene to stop, then resume
    this.scene.get("CombatScene").events.once("shutdown", () => {
      this.inCombat = false;
    });
  }
}
