import { Scene } from "phaser";
import { debugBridge, type DebugCommandHandler, type DebugStateProvider } from "../debug";
import { session } from "../session";
import { MONSTERS, type MonsterDef } from "../data/monsters";
import { getStatus, type RegistrationStatus } from "../model/monsterRegistry";

const WIDTH = 320;
const HEIGHT = 240;
const BORDER_TEXTURE = "dialog-border";
const BORDER_SLICE = 3;

const TEXT_COLOR = "#1a1a1a";
const GRAY_COLOR = "#999999";
const CAUGHT_COLOR = "#338833";
const CURSOR_CHAR = "\u25b6";

// Key codes
const KEY_UP = 38;
const KEY_DOWN = 40;
const KEY_LEFT = 37;
const KEY_RIGHT = 39;
const KEY_SPACE = 32;
const KEY_Z = 90;
const KEY_ENTER = 13;
const KEY_ESC = 27;
const KEY_X = 88;
const KEY_BACKSPACE = 8;

// Layout
const LIST_ITEM_H = 14;
const MAX_VISIBLE = 14;
const LIST_X = 16;
const LIST_Y = 24;

type JournalMode = "list" | "detail";

interface MonsterEntry {
  index: number;
  slug: string;
  def: MonsterDef;
  status: RegistrationStatus;
}

export class JournalScene extends Scene implements DebugStateProvider, DebugCommandHandler {
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prevKeys: Record<string, boolean> = {};

  private mode: JournalMode = "list";
  private entries: MonsterEntry[] = [];
  private selected = 0;
  private scrollOffset = 0;

  // List mode UI
  private listLabels: Phaser.GameObjects.Text[] = [];
  private listCursor!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private countText!: Phaser.GameObjects.Text;

  // Detail mode UI
  private detailContainer!: Phaser.GameObjects.Container;
  private detailSprite: Phaser.GameObjects.Image | null = null;
  private detailBobTween: Phaser.Tweens.Tween | null = null;

  // Background
  private overlay!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.NineSlice;

  // Index of the currently viewed monster in the registered list (for LEFT/RIGHT cycling)
  private registeredIndices: number[] = [];

  constructor() {
    super("JournalScene");
  }

  create() {
    this.selected = 0;
    this.scrollOffset = 0;
    this.mode = "list";
    this.prevKeys = {};
    this.listLabels = [];
    this.detailSprite = null;
    this.detailBobTween = null;

    this.buildEntries();

    // Background
    this.overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0xe8e0d0);
    this.overlay.setDepth(0);

    this.panel = this.add.nineslice(
      WIDTH / 2,
      HEIGHT / 2,
      BORDER_TEXTURE,
      undefined,
      WIDTH,
      HEIGHT,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
    );
    this.panel.setDepth(1);

    // Title
    this.titleText = this.add.text(WIDTH / 2, 8, "Journal", {
      fontSize: "12px",
      color: TEXT_COLOR,
    });
    this.titleText.setOrigin(0.5, 0);
    this.titleText.setDepth(5);

    // Seen/caught count
    const seenCount = session.monsterRegistry.seen.size;
    const caughtCount = session.monsterRegistry.caught.size;
    const totalCount = this.entries.length;
    this.countText = this.add.text(
      WIDTH - 12,
      8,
      `Seen: ${seenCount}/${totalCount}  Caught: ${caughtCount}`,
      { fontSize: "8px", color: GRAY_COLOR },
    );
    this.countText.setOrigin(1, 0);
    this.countText.setDepth(5);

    // List cursor
    this.listCursor = this.add.text(LIST_X - 10, LIST_Y, CURSOR_CHAR, {
      fontSize: "10px",
      color: TEXT_COLOR,
    });
    this.listCursor.setDepth(5);

    // Detail container
    this.detailContainer = this.add.container(0, 0);
    this.detailContainer.setDepth(5);
    this.detailContainer.setVisible(false);

    this.buildListLabels();
    this.updateListCursor();

    // Keys
    this.keys = {
      up: this.input.keyboard!.addKey(KEY_UP),
      down: this.input.keyboard!.addKey(KEY_DOWN),
      left: this.input.keyboard!.addKey(KEY_LEFT),
      right: this.input.keyboard!.addKey(KEY_RIGHT),
      confirm: this.input.keyboard!.addKey(KEY_SPACE),
      confirmZ: this.input.keyboard!.addKey(KEY_Z),
      confirmEnter: this.input.keyboard!.addKey(KEY_ENTER),
      back: this.input.keyboard!.addKey(KEY_ESC),
      backX: this.input.keyboard!.addKey(KEY_X),
      backspace: this.input.keyboard!.addKey(KEY_BACKSPACE),
    };

    debugBridge.setScene(this);
    debugBridge.emit("scene_started", { scene: "JournalScene" });

    this.events.once("shutdown", () => {
      debugBridge.emit("scene_stopped", { scene: "JournalScene" });
    });
  }

  update() {
    if (this.mode === "list") {
      this.updateList();
    } else if (this.mode === "detail") {
      this.updateDetail();
    }

    for (const [name, key] of Object.entries(this.keys)) {
      this.prevKeys[name] = key.isDown;
    }
  }

  // --- Debug ---

  getDebugState(): Record<string, unknown> {
    return {
      journal: {
        mode: this.mode,
        selected: this.selected,
        scrollOffset: this.scrollOffset,
        entryCount: this.entries.length,
        selectedSlug: this.entries[this.selected]?.slug ?? null,
      },
    };
  }

  debugSelectChoice(index: number): void {
    if (this.mode === "list") {
      if (index >= 0 && index < this.entries.length) {
        this.selected = index;
        this.ensureVisible();
        this.buildListLabels();
        this.updateListCursor();
        const entry = this.entries[this.selected];
        if (entry.status !== "unknown") {
          this.openDetail();
        }
      }
    }
  }

  // --- Entry building ---

  private buildEntries() {
    const registry = session.monsterRegistry;
    const allSlugs = Object.keys(MONSTERS);
    this.entries = allSlugs.map((slug, i) => ({
      index: i + 1,
      slug,
      def: MONSTERS[slug],
      status: getStatus(registry, slug),
    }));

    // Build registered indices for LEFT/RIGHT cycling in detail view
    this.registeredIndices = this.entries
      .filter((e) => e.status !== "unknown")
      .map((e) => this.entries.indexOf(e));
  }

  // --- List mode ---

  private buildListLabels() {
    for (const label of this.listLabels) label.destroy();
    this.listLabels = [];

    const visibleCount = Math.min(MAX_VISIBLE, this.entries.length);
    for (let i = 0; i < visibleCount; i++) {
      const entryIdx = this.scrollOffset + i;
      if (entryIdx >= this.entries.length) break;

      const entry = this.entries[entryIdx];
      const num = String(entry.index).padStart(2, "0");
      let text: string;
      let color: string;

      if (entry.status === "unknown") {
        text = `${num}. ???`;
        color = GRAY_COLOR;
      } else if (entry.status === "seen") {
        text = `${num}. ${entry.def.name}`;
        color = TEXT_COLOR;
      } else {
        // caught
        text = `${num}. ${entry.def.name} \u2714`;
        color = CAUGHT_COLOR;
      }

      const label = this.add.text(LIST_X, LIST_Y + i * LIST_ITEM_H, text, {
        fontSize: "10px",
        color,
      });
      label.setDepth(5);
      this.listLabels.push(label);
    }
  }

  private updateListCursor() {
    const visualIndex = this.selected - this.scrollOffset;
    this.listCursor.setY(LIST_Y + visualIndex * LIST_ITEM_H);
  }

  private ensureVisible() {
    if (this.selected < this.scrollOffset) {
      this.scrollOffset = this.selected;
    } else if (this.selected >= this.scrollOffset + MAX_VISIBLE) {
      this.scrollOffset = this.selected - MAX_VISIBLE + 1;
    }
  }

  private updateList() {
    if (this.justPressed("up")) {
      this.selected = (this.selected - 1 + this.entries.length) % this.entries.length;
      this.ensureVisible();
      this.buildListLabels();
      this.updateListCursor();
    }

    if (this.justPressed("down")) {
      this.selected = (this.selected + 1) % this.entries.length;
      this.ensureVisible();
      this.buildListLabels();
      this.updateListCursor();
    }

    if (this.isConfirmPressed()) {
      const entry = this.entries[this.selected];
      if (entry.status !== "unknown") {
        this.openDetail();
      }
    }

    if (this.isBackPressed()) {
      this.closeScreen();
    }
  }

  // --- Detail mode ---

  private openDetail() {
    this.mode = "detail";
    this.setListVisible(false);
    this.buildDetail();
    debugBridge.emit("journal_detail", { slug: this.entries[this.selected].slug });
  }

  private closeDetail() {
    this.mode = "list";
    this.clearDetail();
    this.detailContainer.setVisible(false);
    this.setListVisible(true);
    this.buildEntries();
    this.buildListLabels();
    this.updateListCursor();
  }

  private setListVisible(visible: boolean) {
    for (const label of this.listLabels) label.setVisible(visible);
    this.listCursor.setVisible(visible);
    this.countText.setVisible(visible);
    this.titleText.setVisible(visible);
  }

  private clearDetail() {
    if (this.detailBobTween) {
      this.detailBobTween.destroy();
      this.detailBobTween = null;
    }
    this.detailSprite = null;
    this.detailContainer.removeAll(true);
  }

  private buildDetail() {
    this.clearDetail();
    this.detailContainer.setVisible(true);

    const entry = this.entries[this.selected];
    const isCaught = entry.status === "caught";

    // Title
    const title = this.add.text(
      WIDTH / 2,
      8,
      `#${String(entry.index).padStart(2, "0")} ${entry.def.name}`,
      {
        fontSize: "12px",
        color: TEXT_COLOR,
      },
    );
    title.setOrigin(0.5, 0);
    this.detailContainer.add(title);

    // Sprite (front-facing, frame 1)
    const texture = `${entry.slug}-battle`;
    if (this.textures.exists(texture)) {
      this.detailSprite = this.add.image(WIDTH / 2, 65, texture, 1);
      this.detailSprite.setScale(2);
      this.detailContainer.add(this.detailSprite);

      this.detailBobTween = this.tweens.add({
        targets: this.detailSprite,
        y: 61,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // Stats section
    const statsX = 20;
    const statsY = 110;
    const lineH = 13;

    if (isCaught) {
      const statLines = [
        `Base HP:  ${entry.def.baseStats.hp}`,
        `Base ATK: ${entry.def.baseStats.attack}`,
        `Base DEF: ${entry.def.baseStats.defense}`,
        `Base SPD: ${entry.def.baseStats.speed}`,
      ];
      for (let i = 0; i < statLines.length; i++) {
        const label = this.add.text(statsX, statsY + i * lineH, statLines[i], {
          fontSize: "9px",
          color: TEXT_COLOR,
        });
        this.detailContainer.add(label);
      }
    } else {
      // Seen but not caught — hide stats
      const statLines = ["Base HP:  ???", "Base ATK: ???", "Base DEF: ???", "Base SPD: ???"];
      for (let i = 0; i < statLines.length; i++) {
        const label = this.add.text(statsX, statsY + i * lineH, statLines[i], {
          fontSize: "9px",
          color: GRAY_COLOR,
        });
        this.detailContainer.add(label);
      }
    }

    // Moves section
    const movesX = 170;
    const movesY = statsY;
    const movesHeader = this.add.text(movesX, movesY, "Moves:", {
      fontSize: "9px",
      color: TEXT_COLOR,
    });
    this.detailContainer.add(movesHeader);

    if (isCaught) {
      for (let i = 0; i < entry.def.moveset.length; i++) {
        const move = entry.def.moveset[i];
        const label = this.add.text(
          movesX,
          movesY + (i + 1) * lineH,
          `Lv${move.learnedAt}: ${move.slug}`,
          { fontSize: "8px", color: TEXT_COLOR },
        );
        this.detailContainer.add(label);
      }
    } else {
      const hidden = this.add.text(movesX, movesY + lineH, "???", {
        fontSize: "8px",
        color: GRAY_COLOR,
      });
      this.detailContainer.add(hidden);
    }

    // Catch rate (only if caught)
    const infoY = statsY + 4 * lineH + 4;
    if (isCaught) {
      const catchLabel = this.add.text(statsX, infoY, `Catch Rate: ${entry.def.catchRate}`, {
        fontSize: "8px",
        color: GRAY_COLOR,
      });
      this.detailContainer.add(catchLabel);
    }

    // Navigation hint
    const navHint = this.add.text(WIDTH / 2, HEIGHT - 12, "\u25c4 \u25ba Cycle   ESC Back", {
      fontSize: "8px",
      color: GRAY_COLOR,
    });
    navHint.setOrigin(0.5, 0.5);
    this.detailContainer.add(navHint);
  }

  private updateDetail() {
    if (this.isBackPressed()) {
      this.closeDetail();
      return;
    }

    // LEFT/RIGHT to cycle through registered (seen/caught) monsters
    if (this.justPressed("left")) {
      this.cycleDetail(-1);
    }
    if (this.justPressed("right")) {
      this.cycleDetail(1);
    }
  }

  private cycleDetail(direction: number) {
    if (this.registeredIndices.length <= 1) return;

    const currentRegIdx = this.registeredIndices.indexOf(this.selected);
    if (currentRegIdx === -1) return;

    const newRegIdx =
      (currentRegIdx + direction + this.registeredIndices.length) % this.registeredIndices.length;
    this.selected = this.registeredIndices[newRegIdx];
    this.ensureVisible();
    this.buildDetail();
    debugBridge.emit("journal_detail", { slug: this.entries[this.selected].slug });
  }

  // --- Input helpers ---

  private justPressed(name: string): boolean {
    return this.keys[name].isDown && !this.prevKeys[name];
  }

  private isConfirmPressed(): boolean {
    return (
      this.justPressed("confirm") ||
      this.justPressed("confirmZ") ||
      this.justPressed("confirmEnter")
    );
  }

  private isBackPressed(): boolean {
    return this.justPressed("back") || this.justPressed("backX") || this.justPressed("backspace");
  }

  // --- Close ---

  private closeScreen() {
    this.scene.stop("JournalScene");
    this.scene.resume("PauseMenuScene");
  }
}
