import { Scene } from "phaser";
import { Monster } from "../model/Monster";
import { EventEngine } from "../event/engine";
import { gameVariables } from "../event/variables";
import type { Direction, EventContext, EventDef, NpcState } from "../event/types";

const PLAYER_SPEED = 80;
const TILE_SIZE = 16;
const GRASS_TILE_ID = 1552;
const ENCOUNTER_RATE = 0.5;

const COTTON_TOWN_EVENTS: EventDef[] = [
  {
    id: 1,
    name: "Talk to Greeter",
    x: 20,
    y: 18,
    width: 1,
    height: 1,
    conditions: [
      { operator: "is", type: "char_facing_tile", args: ["player"] },
      { operator: "is", type: "button_pressed", args: ["INTERACT"] },
    ],
    actions: [
      { type: "dialog", args: ["Welcome to Cotton Town! The monsters here are restless..."] },
      { type: "set_variable", args: ["greeted:yes"] },
    ],
  },
];

export class OverworldScene extends Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private collisionBodies!: Phaser.Physics.Arcade.StaticGroup;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
  private lastTileX = -1;
  private lastTileY = -1;
  private inCombat = false;
  private playerFacing: Direction = "down";
  private interactPressed = false;
  private eventEngine!: EventEngine;
  private npcs = new Map<string, NpcState>();

  constructor() {
    super("OverworldScene");
  }

  preload() {
    this.load.tilemapTiledJSON("town-map", "assets/maps/cotton_town.json");
    this.load.image("core_city_and_country", "assets/maps/core_city_and_country.png");
    this.load.image("core_outdoor", "assets/maps/core_outdoor.png");
    this.load.image("core_buildings", "assets/maps/core_buildings.png");
    this.load.image("core_set_pieces", "assets/maps/core_set pieces.png");
    this.load.spritesheet("player", "assets/sprites/adventurer.png", {
      frameWidth: 16,
      frameHeight: 32,
    });
  }

  create() {
    const map = this.make.tilemap({ key: "town-map" });

    const tilesets = [
      map.addTilesetImage("core_city_and_country", "core_city_and_country")!,
      map.addTilesetImage("core_outdoor", "core_outdoor")!,
      map.addTilesetImage("core_buildings", "core_buildings")!,
      map.addTilesetImage("core_set pieces", "core_set_pieces")!,
    ];

    // Create tile layers — pass all tilesets so any layer can use any tile
    for (const layerData of map.layers) {
      const layer = map.createLayer(layerData.name, tilesets)!;
      if (layerData.name === "Above Player") {
        layer.setDepth(10);
      }
      if (layerData.name === "Ground") {
        this.groundLayer = layer;
      }
    }

    // Player — start near center of the 40x40 map
    const startX = 20 * TILE_SIZE + TILE_SIZE / 2;
    const startY = 20 * TILE_SIZE;
    this.player = this.physics.add.sprite(startX, startY, "player", 1);
    this.player.setSize(12, 12);
    this.player.setOffset(2, 18);
    this.player.setDepth(5);

    // Walk animations
    this.createWalkAnimation("walk-down", 0);
    this.createWalkAnimation("walk-left", 1);
    this.createWalkAnimation("walk-right", 2);
    this.createWalkAnimation("walk-up", 3);

    // NPC sprite — static greeter near player start
    // Sprite center placed same way as player: tileY * TILE_SIZE
    const npcTileX = 20;
    const npcTileY = 18;
    const npcX = npcTileX * TILE_SIZE + TILE_SIZE / 2;
    const npcY = npcTileY * TILE_SIZE;
    const npcSprite = this.add.sprite(npcX, npcY, "player", 1);
    npcSprite.setDepth(5);
    this.npcs.set("greeter", {
      slug: "greeter",
      tileX: npcTileX,
      tileY: npcTileY,
      facing: "down",
      sprite: npcSprite,
    });

    // Collision from object layer rectangles
    this.collisionBodies = this.physics.add.staticGroup();
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

    // NPC collision body — placed at the foot tile center so it blocks
    // the player from entering the NPC's tile (not the head area)
    const npcBodyY = npcTileY * TILE_SIZE + TILE_SIZE / 2;
    const npcCollision = this.add.rectangle(npcX, npcBodyY, TILE_SIZE, TILE_SIZE);
    npcCollision.setVisible(false);
    this.collisionBodies.add(npcCollision);

    // Camera
    this.cameras.main.startFollow(this.player, true);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.player.setCollideWorldBounds(true);

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

    // Event engine
    this.eventEngine = new EventEngine(COTTON_TOWN_EVENTS);
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

    const blocked = this.eventEngine.blocking;

    if (!blocked) {
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
      player: { tileX, tileY, facing: this.playerFacing },
      variables: gameVariables,
      interactPressed: this.interactPressed,
      npcs: this.npcs,
    };

    this.eventEngine.update(ctx, delta / 1000);

    // Clear per-frame input
    this.interactPressed = false;

    if (!blocked) {
      this.checkEncounter();
    }
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
