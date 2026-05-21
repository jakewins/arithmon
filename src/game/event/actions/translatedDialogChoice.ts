import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { t } from "../../i18n";
import { formatText } from "../../textFormatter";
import { debugBridge } from "../../debug";
import { SCREEN_W, SCREEN_H } from "../../screen";
import { addText, BODY } from "../../ui/textStyle";

// Choice overlay sizing — mirrors the conventions in `event/ui/dialogBox.ts`
// so the choice box visually matches the dialog box that almost always
// precedes it.  At 8-px font + 2-px line spacing each option occupies 10 px;
// padding + the cursor column reserve 8 px on the left.
const WIDTH = SCREEN_W;
const HEIGHT = SCREEN_H;
const FONT_SIZE = 8;
const LINE_SPACING = 2;
const OPTION_H = FONT_SIZE + LINE_SPACING;
const PAD_X = 8;
const PAD_Y = 4;
// Default box height matches the standard DialogBox (4 lines fit comfortably);
// grows when an option list exceeds that.
const BOX_H = 48;
const BORDER_TEXTURE = "dialog-border";
const BORDER_SLICE = 3;

// Key codes to avoid referencing the Phaser global at module level
const KEY_UP = 38;
const KEY_DOWN = 40;

class TranslatedDialogChoiceAction implements EventAction {
  type = "translated_dialog_choice";
  done = false;

  private options: string[];
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
    // Syntax: translated_dialog_choice opt1:opt2:opt3,variable_name
    // args is already split on comma: ["opt1:opt2:opt3", "variable_name"]
    const optionsStr = args[0];
    this.variable = args[1];
    this.options = optionsStr.split(":");
  }

  start(ctx: EventContext): void {
    const scene = ctx.scene;

    // Size the box to fit all options
    const boxHeight = Math.max(BOX_H, this.options.length * OPTION_H + PAD_Y * 2);
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

    for (let i = 0; i < this.options.length; i++) {
      const label = addText(
        scene,
        PAD_X + 8,
        boxY + PAD_Y + i * OPTION_H,
        formatText(t(this.options[i])),
        BODY,
      );
      label.setDepth(101).setScrollFactor(0);
      this.labels.push(label);
    }

    this.cursor = addText(scene, PAD_X, boxY + PAD_Y, "\u25b6", BODY);
    this.cursor.setDepth(101).setScrollFactor(0);

    this.upKey = scene.input.keyboard!.addKey(KEY_UP);
    this.downKey = scene.input.keyboard!.addKey(KEY_DOWN);

    debugBridge.emit("choice_presented", {
      options: this.options.map((o) => formatText(t(o))),
    });
  }

  update(ctx: EventContext): void {
    // Manual edge detection for key presses (avoids Phaser.Input.Keyboard.JustDown)
    const upDown = this.upKey.isDown;
    const downDown = this.downKey.isDown;

    if (upDown && !this.prevUp) {
      this.selected = (this.selected - 1 + this.options.length) % this.options.length;
    }
    if (downDown && !this.prevDown) {
      this.selected = (this.selected + 1) % this.options.length;
    }

    this.prevUp = upDown;
    this.prevDown = downDown;

    // Update cursor position
    const boxY = this.bg.y - this.bg.height / 2;
    this.cursor.setY(boxY + PAD_Y + this.selected * OPTION_H);

    // Debug override: programmatic choice selection from A.selectChoice()
    if (ctx.debugChoiceOverride !== undefined) {
      const idx = ctx.debugChoiceOverride;
      if (idx >= 0 && idx < this.options.length) {
        this.selected = idx;
        ctx.variables.set(this.variable, this.options[this.selected]);
        debugBridge.emit("choice_selected", {
          index: this.selected,
          text: formatText(t(this.options[this.selected])),
        });
        this.done = true;
      }
      return;
    }

    // Ignore the interact press on the first frame — it's the residual press
    // that dismissed the previous action (e.g. a dialog) in the same step() loop.
    if (this.firstFrame) {
      this.firstFrame = false;
      return;
    }

    // Confirm selection
    if (ctx.interactPressed) {
      ctx.variables.set(this.variable, this.options[this.selected]);
      debugBridge.emit("choice_selected", {
        index: this.selected,
        text: t(this.options[this.selected]),
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

registerAction("translated_dialog_choice", (args) => new TranslatedDialogChoiceAction(args));
