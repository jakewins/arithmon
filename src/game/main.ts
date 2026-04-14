import { AUTO, Game } from "phaser";
import { HelloScene } from "./scenes/HelloScene";

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  backgroundColor: "#1a1a2e",
  scene: [HelloScene],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;
