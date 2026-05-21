import { SCREEN_W, SCREEN_H } from "../../screen";
import { addText, BODY, withColor } from "../../ui/textStyle";

const WIDTH = SCREEN_W;
const HEIGHT = SCREEN_H;
// Bottom dialog box: ~⅓ of the 144 px viewport. Sized to fit four lines of
// 8 px text (plus 2 px line spacing) — same MAX_LINES_PER_PAGE as upstream.
const BOX_H = 48;
const BOX_Y = HEIGHT - BOX_H;
const PAD_X = 8;
const PAD_Y = 4;
const TEXT_WIDTH = WIDTH - PAD_X * 2;
const CHARS_PER_SEC = 30;
const FONT_SIZE = 8;
const LINE_SPACING = 2;
const LINE_H = FONT_SIZE + LINE_SPACING;
const MAX_LINES_PER_PAGE = Math.floor((BOX_H - PAD_Y * 2) / LINE_H);

const BORDER_TEXTURE = "dialog-border";
const BORDER_SLICE = 3; // px per slice edge in the 9x9 source image

const TEXT_COLOR = "#1a1a1a";
const PROMPT_COLOR = "#1a1a1a";

export interface DialogBoxConfig {
  textColor?: string;
  promptColor?: string;
}

/**
 * Splits already-wrapped text (containing newlines) into pages
 * of at most `maxLines` lines each.
 */
export function paginate(wrappedText: string, maxLines: number): string[] {
  const lines = wrappedText.split("\n");
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    pages.push(lines.slice(i, i + maxLines).join("\n"));
  }
  return pages.length > 0 ? pages : [""];
}

export class DialogBox {
  isDone = false;

  private scene: Phaser.Scene;
  private pages: string[] = [];
  private pageIndex = 0;
  private charIndex = 0;
  private charTimer = 0;
  private pageReady = false;

  private border!: Phaser.GameObjects.NineSlice;
  private label!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;

  private textColor: string;
  private promptColor: string;

  constructor(
    scene: Phaser.Scene,
    private fullText: string,
    config?: DialogBoxConfig,
  ) {
    this.scene = scene;
    this.textColor = config?.textColor ?? TEXT_COLOR;
    this.promptColor = config?.promptColor ?? PROMPT_COLOR;
  }

  start(): void {
    const scene = this.scene;

    // Nine-slice border (acts as background too — the center slice is the light bg)
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

    // Text label — start empty to avoid a flash of full text, then use
    // getWrappedText with the full string for pagination.
    this.label = addText(scene, PAD_X, BOX_Y + PAD_Y, "", {
      ...withColor(BODY, this.textColor),
      wordWrap: { width: TEXT_WIDTH },
      lineSpacing: LINE_SPACING,
    });
    this.label.setDepth(101).setScrollFactor(0);

    // Paginate from the Phaser-wrapped text (doesn't need to be in the label)
    const wrappedText = this.label.getWrappedText(this.fullText).join("\n");
    this.pages = paginate(wrappedText, MAX_LINES_PER_PAGE);
    this.pageIndex = 0;

    // Prompt indicator (down-arrow in bottom-right of the box)
    this.prompt = addText(
      scene,
      WIDTH - 12,
      BOX_Y + BOX_H - 10,
      "\u25bc",
      withColor(BODY, this.promptColor),
    );
    this.prompt.setDepth(101).setScrollFactor(0);
    this.prompt.setVisible(false);
  }

  update(dt: number, interactPressed: boolean): void {
    if (this.isDone) return;

    const currentPage = this.pages[this.pageIndex];

    if (!this.pageReady) {
      // Typewriter effect
      this.charTimer += dt;
      const charsToShow = Math.floor(this.charTimer * CHARS_PER_SEC);
      if (charsToShow > this.charIndex) {
        this.charIndex = Math.min(charsToShow, currentPage.length);
        this.label.setText(currentPage.slice(0, this.charIndex));
      }

      if (this.charIndex >= currentPage.length) {
        this.pageReady = true;
        this.prompt.setVisible(true);
      }

      // Skip to full page text on interact
      if (interactPressed && !this.pageReady) {
        this.charIndex = currentPage.length;
        this.label.setText(currentPage);
        this.pageReady = true;
        this.prompt.setVisible(true);
        return; // consume this press for skip
      }
    } else if (interactPressed) {
      if (this.pageIndex < this.pages.length - 1) {
        // Advance to next page
        this.pageIndex++;
        this.charIndex = 0;
        this.charTimer = 0;
        this.pageReady = false;
        this.prompt.setVisible(false);
        this.label.setText("");
      } else {
        // Last page — dismiss
        this.isDone = true;
      }
    }
  }

  destroy(): void {
    this.border.destroy();
    this.label.destroy();
    this.prompt.destroy();
  }
}
