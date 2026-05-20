import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { getNpcSprite, hasNpcSprite } from "../../data/npcs";
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
 * Syntax: change_bg_char <color>,<npcSlugOrSpriteKey>
 *
 * The second argument is usually an NPC slug (e.g. `spyder_omnichannel_beaverbrook`).
 * We resolve it through the NPC registry to find the actual spritesheet name
 * (e.g. `ceo`) — upstream Tuxemon does the same lookup. If the slug isn't in
 * the registry we fall back to using it directly as a texture key so existing
 * QA scripts that pass raw sheet names keep working.
 *
 * A full-screen backdrop rectangle covers the room; the character sprite is
 * drawn on top of it. Shares the overlay stash with change_bg /
 * change_bg_monster so consecutive calls clean up correctly.
 */
class ChangeBgCharAction implements EventAction {
  type = "change_bg_char";
  done = false;

  private color: number;
  private rawKey: string;

  constructor(args: string[]) {
    const name = args[0];
    this.color = NAMED_COLORS[name] ?? 0x000000;
    this.rawKey = args[1] ?? "";
  }

  start(ctx: EventContext): void {
    ctx.scene.cameras.main.setBackgroundColor(this.color);
    destroyOverlay(ctx.scene);

    // Full-screen backdrop to cover the room
    const backdrop = ctx.scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, this.color);
    backdrop.setDepth(49).setScrollFactor(0);

    // Prefer the NPC-registry spritesheet; fall back to raw key.
    const resolvedKey = resolveTextureKey(ctx, this.rawKey);

    let sprite: Phaser.GameObjects.Sprite | null = null;
    if (resolvedKey && ctx.scene.textures?.exists(resolvedKey)) {
      sprite = ctx.scene.add.sprite(WIDTH / 2, SPRITE_Y, resolvedKey, 0);
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

function resolveTextureKey(ctx: EventContext, rawKey: string): string {
  if (!rawKey) return "";
  if (hasNpcSprite(rawKey)) {
    const sheet = getNpcSprite(rawKey).spritesheet;
    if (ctx.scene.textures?.exists(sheet)) return sheet;
  }
  return rawKey;
}

registerAction("change_bg_char", (args) => new ChangeBgCharAction(args));
