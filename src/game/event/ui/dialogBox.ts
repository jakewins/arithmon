const WIDTH = 320;
const HEIGHT = 240;
const BOX_H = 64;
const BOX_Y = HEIGHT - BOX_H;
const PAD_X = 12;
const PAD_Y = 6;
const TEXT_WIDTH = WIDTH - PAD_X * 2;
const CHARS_PER_SEC = 30;
const FONT_SIZE = 11;
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

    // Text label — we create it with the full text first to let Phaser word-wrap,
    // then read back the wrapped result for pagination, then clear it for typewriter.
    this.label = scene.add.text(PAD_X, BOX_Y + PAD_Y, this.fullText, {
      fontSize: `${FONT_SIZE}px`,
      color: this.textColor,
      wordWrap: { width: TEXT_WIDTH },
      lineSpacing: LINE_SPACING,
    });
    this.label.setDepth(101).setScrollFactor(0);

    // Paginate from the Phaser-wrapped text
    const wrappedText = this.label.getWrappedText(this.fullText).join("\n");
    this.pages = paginate(wrappedText, MAX_LINES_PER_PAGE);
    this.pageIndex = 0;

    // Clear label for typewriter
    this.label.setText("");

    // Prompt indicator
    this.prompt = scene.add.text(WIDTH - 20, BOX_Y + BOX_H - 16, "\u25bc", {
      fontSize: "11px",
      color: this.promptColor,
    });
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
