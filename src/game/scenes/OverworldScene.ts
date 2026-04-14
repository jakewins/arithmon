import { Scene } from "phaser";

const PLAYER_SPEED = 80;
const TILE_SIZE = 16;

export class OverworldScene extends Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private collisionBodies!: Phaser.Physics.Arcade.StaticGroup;

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

    // Camera
    this.cameras.main.startFollow(this.player, true);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.player.setCollideWorldBounds(true);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
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

  update() {
    this.player.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-PLAYER_SPEED);
      this.player.anims.play("walk-left", true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(PLAYER_SPEED);
      this.player.anims.play("walk-right", true);
    } else if (this.cursors.up.isDown) {
      this.player.setVelocityY(-PLAYER_SPEED);
      this.player.anims.play("walk-up", true);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(PLAYER_SPEED);
      this.player.anims.play("walk-down", true);
    } else {
      this.player.anims.stop();
    }
  }
}
