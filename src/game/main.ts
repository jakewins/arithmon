import { AUTO, Game } from "phaser";
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
  width: 320,
  height: 240,
  parent: "game-container",
  backgroundColor: "#1a1a2e",
  pixelArt: true,
  scale: {
    zoom: 3,
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

const StartGame = (parent: string) => {
  const game = new Game({ ...config, parent });

  if (import.meta.env.DEV) {
    window.A = debugBridge;
  }

  return game;
};

export default StartGame;
