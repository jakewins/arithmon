import { Scene } from "phaser";

const PLAYER_SPEED = 80;

export class OverworldScene extends Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer;

  constructor() {
    super("OverworldScene");
  }

  preload() {
    this.load.tilemapTiledJSON("starter-map", "assets/maps/starter.json");
    this.load.image("core_outdoor", "assets/maps/core_outdoor.png");
    this.load.spritesheet("player", "assets/sprites/adventurer.png", {
      frameWidth: 16,
      frameHeight: 32,
    });
  }

  create() {
    // Map
    const map = this.make.tilemap({ key: "starter-map" });
    const tileset = map.addTilesetImage("core_outdoor", "core_outdoor")!;

    map.createLayer("ground", tileset);
    this.collisionLayer = map.createLayer("collision", tileset)!;

    // Any non-zero tile on the collision layer is solid
    this.collisionLayer.setCollisionByExclusion([-1, 0]);

    // Player — start near center of the map
    const startX = 10 * 16 + 8;
    const startY = 7 * 16 + 16;
    this.player = this.physics.add.sprite(startX, startY, "player", 1);
    this.player.setSize(12, 12);
    this.player.setOffset(2, 18);

    // Animations: 4 rows x 3 cols (walk1, idle, walk2)
    // Row 0 = down, Row 1 = left, Row 2 = right, Row 3 = up
    this.createWalkAnimation("walk-down", 0);
    this.createWalkAnimation("walk-left", 1);
    this.createWalkAnimation("walk-right", 2);
    this.createWalkAnimation("walk-up", 3);

    // Collision
    this.physics.add.collider(this.player, this.collisionLayer);

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
