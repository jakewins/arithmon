import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { MONSTERS } from "../../data/monsters";
import { debugBridge } from "../../debug";

const WIDTH = 320;
const HEIGHT = 240;
const BOX_H = 64;
const OPTION_H = 13;
const PAD_X = 12;
const PAD_Y = 6;
const BORDER_TEXTURE = "dialog-border";
const BORDER_SLICE = 3;

const KEY_UP = 38;
const KEY_DOWN = 40;

class ChoiceMonsterAction implements EventAction {
  type = "choice_monster";
  done = false;

  private slugs: string[];
  private variable: string;
  private selected = 0;
  private bg!: Phaser.GameObjects.NineSlice;
  private labels: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private prevUp = false;
  private prevDown = false;
  private firstFrame = true;

  constructor(args: string[]) {
    // Syntax: choice_monster slug1:slug2:slug3,variable_name
    this.slugs = args[0].split(":");
    this.variable = args[1];
  }

  start(ctx: EventContext): void {
    const scene = ctx.scene;

    const names = this.slugs.map((s) => MONSTERS[s]?.name ?? s);
    const boxHeight = Math.max(BOX_H, names.length * OPTION_H + PAD_Y * 2);
    const boxY = HEIGHT - boxHeight;

    this.bg = scene.add.nineslice(
      WIDTH / 2,
      boxY + boxHeight / 2,
      BORDER_TEXTURE,
      undefined,
      WIDTH,
      boxHeight,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
    );
    this.bg.setDepth(100).setScrollFactor(0);

    for (let i = 0; i < names.length; i++) {
      const label = scene.add.text(PAD_X + 16, boxY + PAD_Y + i * OPTION_H, names[i], {
        fontSize: "11px",
        color: "#1a1a1a",
      });
      label.setDepth(101).setScrollFactor(0);
      this.labels.push(label);
    }

    this.cursor = scene.add.text(PAD_X, boxY + PAD_Y, "\u25b6", {
      fontSize: "11px",
      color: "#1a1a1a",
    });
    this.cursor.setDepth(101).setScrollFactor(0);

    this.upKey = scene.input.keyboard!.addKey(KEY_UP);
    this.downKey = scene.input.keyboard!.addKey(KEY_DOWN);

    debugBridge.emit("choice_presented", { options: names });
  }

  update(ctx: EventContext): void {
    const upDown = this.upKey.isDown;
    const downDown = this.downKey.isDown;

    if (upDown && !this.prevUp) {
      this.selected = (this.selected - 1 + this.slugs.length) % this.slugs.length;
    }
    if (downDown && !this.prevDown) {
      this.selected = (this.selected + 1) % this.slugs.length;
    }

    this.prevUp = upDown;
    this.prevDown = downDown;

    const boxY = this.bg.y - this.bg.height / 2;
    this.cursor.setY(boxY + PAD_Y + this.selected * OPTION_H);

    // Debug override
    if (ctx.debugChoiceOverride !== undefined) {
      const idx = ctx.debugChoiceOverride;
      if (idx >= 0 && idx < this.slugs.length) {
        this.selected = idx;
        ctx.variables.set(this.variable, this.slugs[this.selected]);
        debugBridge.emit("choice_selected", {
          index: this.selected,
          text: this.slugs[this.selected],
        });
        this.done = true;
      }
      return;
    }

    if (this.firstFrame) {
      this.firstFrame = false;
      return;
    }

    if (ctx.interactPressed) {
      ctx.variables.set(this.variable, this.slugs[this.selected]);
      debugBridge.emit("choice_selected", {
        index: this.selected,
        text: this.slugs[this.selected],
      });
      this.done = true;
    }
  }

  cleanup(): void {
    this.bg.destroy();
    for (const label of this.labels) {
      label.destroy();
    }
    this.cursor.destroy();
  }
}

registerAction("choice_monster", (args) => new ChoiceMonsterAction(args));
