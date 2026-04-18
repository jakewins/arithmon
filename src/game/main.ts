import { AUTO, Game } from "phaser";
import { OverworldScene } from "./scenes/OverworldScene";
import { CombatScene } from "./scenes/CombatScene";
import { MathProblemScene } from "./scenes/MathProblemScene";
import { CutsceneScene } from "./scenes/CutsceneScene";
import { PauseMenuScene } from "./scenes/PauseMenuScene";
import { debugBridge } from "./debug";

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
  scene: [OverworldScene, CombatScene, MathProblemScene, CutsceneScene, PauseMenuScene],
};

const StartGame = (parent: string) => {
  const game = new Game({ ...config, parent });

  if (import.meta.env.DEV) {
    window.A = debugBridge;
  }

  return game;
};

export default StartGame;
