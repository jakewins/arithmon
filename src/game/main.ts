import { AUTO, Core, Game, Scale } from "phaser";
import { SCREEN_W, SCREEN_H } from "./screen";
import { ensureUiFontLoaded, refreshCrispResolution } from "./ui/textStyle";
import { TitleScene } from "./scenes/TitleScene";
import { OverworldScene } from "./scenes/OverworldScene";
import { CombatScene } from "./scenes/CombatScene";
import { MathProblemScene } from "./scenes/MathProblemScene";
import { CutsceneScene } from "./scenes/CutsceneScene";
import { PauseMenuScene } from "./scenes/PauseMenuScene";
import { PartyScreen } from "./scenes/PartyScreen";
import { JournalScene } from "./scenes/JournalScene";
import { MonsterInfoScene } from "./scenes/MonsterInfoScene";
import { ShopScene } from "./scenes/ShopScene";
import { BagScene } from "./scenes/BagScene";
import { debugBridge } from "./debug";
import { loadGame } from "./save";

// Restore saved session state (monsters, inventory, variables, etc.)
// before Phaser boots, so OverworldScene.init sees the restored data.
loadGame();

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: SCREEN_W,
  height: SCREEN_H,
  parent: "game-container",
  backgroundColor: "#1a1a2e",
  pixelArt: true,
  scale: {
    // We size the canvas ourselves on every parent resize (see
    // snapToIntegerZoom below) so pixel art lands on whole pixels.
    // FIT would otherwise pick a fractional zoom (e.g. 7.5× at 1920×1080).
    mode: Scale.NONE,
    autoCenter: Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
    },
  },
  // TitleScene must come first so Phaser auto-starts it on boot.
  scene: [
    TitleScene,
    OverworldScene,
    CombatScene,
    MathProblemScene,
    CutsceneScene,
    PauseMenuScene,
    PartyScreen,
    JournalScene,
    MonsterInfoScene,
    ShopScene,
    BagScene,
  ],
};

/**
 * Snap the canvas to the largest integer zoom that still fits the viewport.
 * Phaser's FIT mode would pick a fractional scale (e.g. 7.5× at 1920×1080),
 * which causes shimmering on tile-edge pixels and inconsistent text rendering
 * for pixel-art games. We compute floor(min(W/256, H/144)) and call setZoom
 * directly; a small letterbox at the edges is the acceptable cost.
 */
function snapToIntegerZoom(game: Game) {
  const baseW = game.scale.gameSize.width;
  const baseH = game.scale.gameSize.height;
  // Use the actual window — Phaser's parent measurements lag behind window
  // resize on some browsers, and a "parent" element only exists if the host
  // page provided one.
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const fitZoom = Math.min(winW / baseW, winH / baseH);
  const intZoom = Math.max(1, Math.floor(fitZoom));
  if (game.scale.zoom !== intZoom) {
    game.scale.setZoom(intZoom);
    // Text objects rasterise their internal canvas at construction time
    // against the then-current zoom. When the user resizes the window
    // into a new integer-zoom band, every existing Text would render its
    // old canvas at the new scale and pick up the same gray AA halo we
    // worked around in textStyle.addText. Re-snap them to the new zoom.
    refreshCrispResolution(intZoom);
  }
}

const StartGame = async (parent: string): Promise<Game> => {
  // PressStart2P must be in the FontFaceSet before Phaser's first paint,
  // otherwise the title screen briefly renders in the fallback Arial. The
  // browser is already fetching the .ttf via `@font-face` in style.css; we
  // just need to await that handle here. `finally` so a font-fetch failure
  // still boots the game (with a fallback face).
  await ensureUiFontLoaded();

  const game = new Game({ ...config, parent });

  const apply = () => snapToIntegerZoom(game);
  game.events.once(Core.Events.READY, () => {
    apply();
    window.addEventListener("resize", apply);
  });

  if (import.meta.env.DEV) {
    window.A = debugBridge;
  }

  return game;
};

export default StartGame;
