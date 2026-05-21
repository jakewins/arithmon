import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { debugBridge } from "../../debug";
import { SCREEN_W, SCREEN_H } from "../../screen";
import { addText, BODY, withColor } from "../../ui/textStyle";

const RANDOM_NAMES = [
  "Ash",
  "Misty",
  "Brock",
  "Dawn",
  "May",
  "Max",
  "Iris",
  "Cilan",
  "Serena",
  "Clemont",
  "Bonnie",
  "Lillie",
  "Lana",
  "Kiawe",
  "Mallow",
  "Sophocles",
  "Goh",
  "Chloe",
];

const NAME_LIMIT = 12;
// Match `event/ui/dialogBox.ts`: BOX_H=48 anchored to the bottom of the
// 256×144 logical canvas, font 8 px, padding 4/8 px. The rename overlay
// stacks three short labels — prompt + editable name + hint — inside the
// same footprint as a standard 4-line dialog page.
const WIDTH = SCREEN_W;
const HEIGHT = SCREEN_H;
const BOX_H = 48;
const BOX_Y = HEIGHT - BOX_H;
const PAD_X = 8;
const PAD_Y = 4;
const FONT_SIZE = 8;
const LINE_H = FONT_SIZE + 2;
const BORDER_TEXTURE = "dialog-border";
const BORDER_SLICE = 3;

/**
 * Tuxemon syntax:
 *   rename_player player,random
 *
 * Shows a text input dialog pre-filled with a random name (when mode is
 * "random") or the current player name. The player can type to change
 * it, then press Enter to confirm.
 */
class RenamePlayerAction implements EventAction {
  type = "rename_player";
  done = false;

  private useRandom: boolean;
  private explicitName: string;
  private border!: Phaser.GameObjects.NineSlice;
  private promptText!: Phaser.GameObjects.Text;
  private inputText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private cursorBlink!: Phaser.Time.TimerEvent;
  private cursorVisible = true;
  private currentValue = "";
  private keyHandler!: (event: KeyboardEvent) => void;

  constructor(args: string[]) {
    // rename_player player,random → args[1] = "random"
    // rename_player random        → args[0] = "random"
    const mode = args[1] ?? args[0] ?? "Player";
    this.useRandom = mode === "random";
    this.explicitName = mode;
  }

  start(ctx: EventContext): void {
    // Non-random: just set the name directly (synchronous)
    if (!this.useRandom) {
      const mode = this.explicitName;
      ctx.session.player.name = mode;
      this.done = true;
      return;
    }

    this.currentValue = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];

    const scene = ctx.scene;

    // Dialog border
    this.border = scene.add.nineslice(
      WIDTH / 2,
      BOX_Y + BOX_H / 2,
      BORDER_TEXTURE,
      undefined,
      WIDTH,
      BOX_H,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
    );
    this.border.setDepth(100).setScrollFactor(0);

    // Prompt label (line 1)
    this.promptText = addText(scene, PAD_X, BOX_Y + PAD_Y, "Enter your name:", BODY);
    this.promptText.setDepth(101).setScrollFactor(0);

    // Editable name display (line 2)
    this.inputText = addText(scene, PAD_X, BOX_Y + PAD_Y + LINE_H, "", BODY);
    this.inputText.setDepth(101).setScrollFactor(0);
    this.updateInputDisplay();

    // Hint text (last line of the box)
    this.hintText = addText(
      scene,
      PAD_X,
      BOX_Y + BOX_H - PAD_Y - FONT_SIZE,
      "Type, then press Enter",
      withColor(BODY, "#666666"),
    );
    this.hintText.setDepth(101).setScrollFactor(0);

    // Blinking cursor
    this.cursorBlink = scene.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.cursorVisible = !this.cursorVisible;
        this.updateInputDisplay();
      },
    });

    // Keyboard handler
    this.keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        if (this.currentValue.trim().length > 0) {
          ctx.session.player.name = this.currentValue.trim();
          this.done = true;
        }
        return;
      }

      if (event.key === "Backspace") {
        this.currentValue = this.currentValue.slice(0, -1);
        this.updateInputDisplay();
        return;
      }

      // Only allow printable characters
      if (event.key.length === 1 && this.currentValue.length < NAME_LIMIT) {
        this.currentValue += event.key;
        this.updateInputDisplay();
      }
    };

    scene.input.keyboard!.on("keydown", this.keyHandler);

    debugBridge.emit("rename_started", { initial: this.currentValue });
  }

  update(): void {
    // Waits for Enter keypress
  }

  cleanup(ctx: EventContext): void {
    if (this.keyHandler) {
      ctx.scene.input.keyboard!.off("keydown", this.keyHandler);
    }
    this.cursorBlink?.destroy();
    this.border?.destroy();
    this.promptText?.destroy();
    this.inputText?.destroy();
    this.hintText?.destroy();
  }

  private updateInputDisplay(): void {
    const cursor = this.cursorVisible ? "|" : " ";
    this.inputText?.setText(this.currentValue + cursor);
  }
}

registerAction("rename_player", (args) => new RenamePlayerAction(args));
