import { Scene } from "phaser";

export class HelloScene extends Scene {
  constructor() {
    super("HelloScene");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY, "Arithmon", {
        fontFamily: "monospace",
        fontSize: 48,
        color: "#e0e0e0",
      })
      .setOrigin(0.5);
  }
}
