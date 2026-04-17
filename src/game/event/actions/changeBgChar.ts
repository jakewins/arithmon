import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import {
  destroyOverlay,
  setOverlay,
  NAMED_COLORS,
  WIDTH,
  HEIGHT,
  SPRITE_Y,
} from "./changeBgShared";

/**
 * Sets the background colour and overlays a character spritesheet frame.
 *
 * Syntax: change_bg_char <color>,<spriteKey>
 *
 * A full-screen backdrop rectangle covers the room; the character sprite
 * is drawn on top of it. Shares the overlay stash with change_bg /
 * change_bg_monster so consecutive calls clean up correctly.
 */
class ChangeBgCharAction implements EventAction {
  type = "change_bg_char";
  done = false;

  private color: number;
  private spriteKey: string;

  constructor(args: string[]) {
    const name = args[0];
    this.color = NAMED_COLORS[name] ?? 0x000000;
    this.spriteKey = args[1] ?? "";
  }

  start(ctx: EventContext): void {
    ctx.scene.cameras.main.setBackgroundColor(this.color);
    destroyOverlay(ctx.scene);

    // Full-screen backdrop to cover the room
    const backdrop = ctx.scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, this.color);
    backdrop.setDepth(49).setScrollFactor(0);

    let sprite: Phaser.GameObjects.Sprite | null = null;
    if (this.spriteKey && ctx.scene.textures?.exists(this.spriteKey)) {
      sprite = ctx.scene.add.sprite(WIDTH / 2, SPRITE_Y, this.spriteKey, 0);
      sprite.setDepth(50).setScrollFactor(0).setScale(4);
    }

    setOverlay(ctx.scene, backdrop, sprite);
    this.done = true;
  }

  update(): void {
    // single-frame
  }

  cleanup(): void {
    // overlay persists until next change_bg* or scene end
  }
}

registerAction("change_bg_char", (args) => new ChangeBgCharAction(args));
