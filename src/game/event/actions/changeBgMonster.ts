import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { destroyOverlay, setOverlay, NAMED_COLORS, SPRITE_Y } from "./changeBgShared";
import { SCREEN_W, SCREEN_H } from "../../screen";

/**
 * Sets the background colour and overlays a monster battle sprite.
 *
 * Syntax: change_bg_monster <color>,<monsterSlug>
 *
 * The texture key is "<slug>-battle" which must be preloaded as a spritesheet.
 * A full-screen backdrop rectangle covers the room; shares the overlay stash
 * with change_bg / change_bg_char.
 */
class ChangeBgMonsterAction implements EventAction {
  type = "change_bg_monster";
  done = false;

  private color: number;
  private textureKey: string;

  constructor(args: string[]) {
    const name = args[0];
    this.color = NAMED_COLORS[name] ?? 0x000000;
    const slug = args[1] ?? "";
    this.textureKey = slug ? `${slug}-battle` : "";
  }

  start(ctx: EventContext): void {
    ctx.scene.cameras.main.setBackgroundColor(this.color);
    destroyOverlay(ctx.scene);

    // Full-screen backdrop to cover the room
    const backdrop = ctx.scene.add.rectangle(
      SCREEN_W / 2,
      SCREEN_H / 2,
      SCREEN_W,
      SCREEN_H,
      this.color,
    );
    backdrop.setDepth(49).setScrollFactor(0);

    let sprite: Phaser.GameObjects.Sprite | null = null;
    if (this.textureKey && ctx.scene.textures?.exists(this.textureKey)) {
      // setScale(1) — battle sprites are ~64-px frames; scale 3 was sized for
      // the old 320×240 canvas and would overflow the new 256×144.
      sprite = ctx.scene.add.sprite(SCREEN_W / 2, SPRITE_Y, this.textureKey, 0);
      sprite.setDepth(50).setScrollFactor(0).setScale(1);
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

registerAction("change_bg_monster", (args) => new ChangeBgMonsterAction(args));
