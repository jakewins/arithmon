import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { t } from "../../i18n";

const WIDTH = 320;
const HEIGHT = 240;
const BOX_H = 48;
const BOX_Y = HEIGHT - BOX_H;

class TranslatedDialogAction implements EventAction {
  type = "translated_dialog";
  done = false;

  private key: string;
  private text = "";
  private bg!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private dismissReady = false;
  private charIndex = 0;
  private charTimer = 0;

  constructor(args: string[]) {
    this.key = args[0];
  }

  start(ctx: EventContext): void {
    this.text = t(this.key);
    const scene = ctx.scene;

    this.bg = scene.add.rectangle(WIDTH / 2, BOX_Y + BOX_H / 2, WIDTH, BOX_H, 0x111111, 0.92);
    this.bg.setDepth(100).setScrollFactor(0);

    this.label = scene.add.text(12, BOX_Y + 8, "", {
      fontSize: "11px",
      color: "#ffffff",
      wordWrap: { width: WIDTH - 24 },
    });
    this.label.setDepth(101).setScrollFactor(0);

    this.prompt = scene.add.text(WIDTH - 20, BOX_Y + BOX_H - 14, "\u25bc", {
      fontSize: "10px",
      color: "#ffffff",
    });
    this.prompt.setDepth(101).setScrollFactor(0);
    this.prompt.setVisible(false);
  }

  update(ctx: EventContext, dt: number): void {
    if (!this.dismissReady) {
      this.charTimer += dt;
      const charsToShow = Math.floor(this.charTimer * 30);
      if (charsToShow > this.charIndex) {
        this.charIndex = Math.min(charsToShow, this.text.length);
        this.label.setText(this.text.slice(0, this.charIndex));
      }

      if (this.charIndex >= this.text.length) {
        this.dismissReady = true;
        this.prompt.setVisible(true);
      }

      if (ctx.interactPressed && !this.dismissReady) {
        this.charIndex = this.text.length;
        this.label.setText(this.text);
        this.dismissReady = true;
        this.prompt.setVisible(true);
        return;
      }
    } else if (ctx.interactPressed) {
      this.done = true;
    }
  }

  cleanup(): void {
    this.bg.destroy();
    this.label.destroy();
    this.prompt.destroy();
  }
}

registerAction("translated_dialog", (args) => new TranslatedDialogAction(args));
