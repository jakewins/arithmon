import { Scene } from "phaser";
import { debugBridge, type DebugCommandHandler, type DebugStateProvider } from "../debug";
import { session } from "../session";
import { PARTY_LIMIT } from "../model/Monster";
import { createMonsterSlot, createEmptySlot, type MonsterSlotObjects } from "../ui/monsterSlot";
import {
  createMonsterPortrait,
  createStatsDisplay,
  createTechniqueList,
  type PortraitObjects,
  type StatsObjects,
} from "../ui/monsterPortrait";

const WIDTH = 320;
const HEIGHT = 240;
const BORDER_TEXTURE = "dialog-border";
const BORDER_SLICE = 3;

const TEXT_COLOR = "#1a1a1a";
const CURSOR_CHAR = "\u25b6";
const HIGHLIGHT_COLOR = 0x4488cc;
const HIGHLIGHT_ALPHA = 0.25;

// Key codes
const KEY_UP = 38;
const KEY_DOWN = 40;
const KEY_SPACE = 32;
const KEY_Z = 90;
const KEY_ENTER = 13;
const KEY_ESC = 27;
const KEY_X = 88;
const KEY_BACKSPACE = 8;

// Layout
const LEFT_W = 140;
const RIGHT_W = WIDTH - LEFT_W;
const SLOT_H = 28;
const SLOT_START_Y = 16;
const SLOT_X = LEFT_W + 12;
const PAD_X = 8;

// Context menu
const CTX_MENU_W = 70;
const CTX_OPTION_H = 14;

type ScreenMode = "browse" | "context" | "move_target" | "summary";

const CONTEXT_OPTIONS = ["Summary", "Move", "Cancel"] as const;

export class PartyScreen extends Scene implements DebugStateProvider, DebugCommandHandler {
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prevKeys: Record<string, boolean> = {};

  private mode: ScreenMode = "browse";
  private slotIndex = 0;
  private ctxIndex = 0;
  private moveSourceIndex = -1;

  // Right side: slot objects
  private slotObjects: (MonsterSlotObjects | null)[] = [];
  private emptySlots: Phaser.GameObjects.Container[] = [];
  private slotHighlight!: Phaser.GameObjects.Rectangle;
  private slotCursor!: Phaser.GameObjects.Text;

  // Left side: detail panel
  private portrait: PortraitObjects | null = null;
  private statsDisplay: StatsObjects | null = null;
  private techList: Phaser.GameObjects.Container | null = null;
  private detailContainer!: Phaser.GameObjects.Container;

  // Context menu
  private ctxContainer!: Phaser.GameObjects.Container;

  // Move mode indicator
  private moveIndicator: Phaser.GameObjects.Text | null = null;

  // Background
  private overlay!: Phaser.GameObjects.Rectangle;
  private leftPanel!: Phaser.GameObjects.NineSlice;
  private rightPanel!: Phaser.GameObjects.NineSlice;

  constructor() {
    super("PartyScreen");
  }

  create() {
    this.slotIndex = 0;
    this.ctxIndex = 0;
    this.moveSourceIndex = -1;
    this.mode = "browse";
    this.prevKeys = {};
    this.slotObjects = [];
    this.emptySlots = [];
    this.portrait = null;
    this.statsDisplay = null;
    this.techList = null;
    this.moveIndicator = null;

    // Background
    this.overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0xe8e0d0);
    this.overlay.setDepth(0);

    // Left panel border
    this.leftPanel = this.add.nineslice(
      LEFT_W / 2,
      HEIGHT / 2,
      BORDER_TEXTURE,
      undefined,
      LEFT_W,
      HEIGHT,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
    );
    this.leftPanel.setDepth(1);

    // Right panel border
    this.rightPanel = this.add.nineslice(
      LEFT_W + RIGHT_W / 2,
      HEIGHT / 2,
      BORDER_TEXTURE,
      undefined,
      RIGHT_W,
      HEIGHT,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
    );
    this.rightPanel.setDepth(1);

    // Slot highlight bar
    this.slotHighlight = this.add.rectangle(
      LEFT_W + RIGHT_W / 2,
      0,
      RIGHT_W - 8,
      SLOT_H,
      HIGHLIGHT_COLOR,
      HIGHLIGHT_ALPHA,
    );
    this.slotHighlight.setDepth(2);

    // Slot cursor
    this.slotCursor = this.add.text(LEFT_W + 4, 0, CURSOR_CHAR, {
      fontSize: "10px",
      color: TEXT_COLOR,
    });
    this.slotCursor.setDepth(10);

    // Detail container (left side)
    this.detailContainer = this.add.container(0, 0);
    this.detailContainer.setDepth(5);

    // Context menu container (hidden initially)
    this.ctxContainer = this.add.container(0, 0);
    this.ctxContainer.setDepth(20);
    this.ctxContainer.setVisible(false);

    this.buildSlots();
    this.updateSlotCursor();
    this.updateDetailPanel();

    // Keys
    this.keys = {
      up: this.input.keyboard!.addKey(KEY_UP),
      down: this.input.keyboard!.addKey(KEY_DOWN),
      confirm: this.input.keyboard!.addKey(KEY_SPACE),
      confirmZ: this.input.keyboard!.addKey(KEY_Z),
      confirmEnter: this.input.keyboard!.addKey(KEY_ENTER),
      back: this.input.keyboard!.addKey(KEY_ESC),
      backX: this.input.keyboard!.addKey(KEY_X),
      backspace: this.input.keyboard!.addKey(KEY_BACKSPACE),
    };

    debugBridge.setScene(this);
    debugBridge.emit("scene_started", { scene: "PartyScreen" });

    this.events.once("shutdown", () => {
      debugBridge.emit("scene_stopped", { scene: "PartyScreen" });
    });
  }

  update() {
    if (this.mode === "browse") {
      this.updateBrowse();
    } else if (this.mode === "context") {
      this.updateContextMenu();
    } else if (this.mode === "move_target") {
      this.updateMoveTarget();
    } else if (this.mode === "summary") {
      this.updateSummary();
    }

    for (const [name, key] of Object.entries(this.keys)) {
      this.prevKeys[name] = key.isDown;
    }
  }

  // --- Debug ---

  getDebugState(): Record<string, unknown> {
    return {
      partyScreen: {
        mode: this.mode,
        slotIndex: this.slotIndex,
        ctxIndex: this.ctxIndex,
        moveSourceIndex: this.moveSourceIndex,
        partyOrder: session.player.monsters.map((m) => m.slug),
      },
    };
  }

  debugSelectChoice(index: number): void {
    if (this.mode === "browse") {
      if (index >= 0 && index < PARTY_LIMIT) {
        this.slotIndex = index;
        this.updateSlotCursor();
        this.updateDetailPanel();
        this.openContextMenu();
      }
    } else if (this.mode === "context") {
      if (index >= 0 && index < CONTEXT_OPTIONS.length) {
        this.ctxIndex = index;
        this.confirmContextOption();
      }
    } else if (this.mode === "move_target") {
      if (index >= 0 && index < PARTY_LIMIT) {
        this.slotIndex = index;
        this.updateSlotCursor();
        this.confirmMoveTarget();
      }
    }
  }

  // --- Slot building ---

  private buildSlots() {
    this.clearSlots();
    const party = session.player.monsters;

    for (let i = 0; i < PARTY_LIMIT; i++) {
      const y = SLOT_START_Y + i * SLOT_H;
      if (i < party.length) {
        const slot = createMonsterSlot(this, SLOT_X, y, party[i], 5);
        this.slotObjects.push(slot);
      } else {
        const empty = createEmptySlot(this, SLOT_X, y, 5);
        this.emptySlots.push(empty);
        this.slotObjects.push(null);
      }
    }
  }

  private clearSlots() {
    for (const slot of this.slotObjects) {
      if (slot) slot.container.destroy();
    }
    for (const empty of this.emptySlots) {
      empty.destroy();
    }
    this.slotObjects = [];
    this.emptySlots = [];
  }

  private updateSlotCursor() {
    const y = SLOT_START_Y + this.slotIndex * SLOT_H + 4;
    this.slotCursor.setY(y);
    this.slotHighlight.setY(SLOT_START_Y + this.slotIndex * SLOT_H + SLOT_H / 2);
  }

  // --- Detail panel ---

  private clearDetailPanel() {
    if (this.portrait) {
      this.portrait.bobTween.destroy();
      this.portrait.container.destroy();
      this.portrait = null;
    }
    if (this.statsDisplay) {
      this.statsDisplay.container.destroy();
      this.statsDisplay = null;
    }
    if (this.techList) {
      this.techList.destroy();
      this.techList = null;
    }
    this.detailContainer.removeAll(true);
  }

  private updateDetailPanel() {
    this.clearDetailPanel();
    const party = session.player.monsters;
    if (this.slotIndex >= party.length) return;

    const monster = party[this.slotIndex];

    // Portrait centered in top part of left panel
    this.portrait = createMonsterPortrait(this, LEFT_W / 2, 50, monster, 5);

    // Stats below portrait
    this.statsDisplay = createStatsDisplay(this, PAD_X + 4, 100, monster, 5);

    // Techniques below stats
    this.techList = createTechniqueList(this, PAD_X + 4, 175, monster, 5);
  }

  // --- Browse mode ---

  private updateBrowse() {
    const party = session.player.monsters;

    if (this.justPressed("up")) {
      this.slotIndex = (this.slotIndex - 1 + party.length) % party.length;
      this.updateSlotCursor();
      this.updateDetailPanel();
    }

    if (this.justPressed("down")) {
      this.slotIndex = (this.slotIndex + 1) % party.length;
      this.updateSlotCursor();
      this.updateDetailPanel();
    }

    if (this.isConfirmPressed()) {
      if (this.slotIndex < party.length) {
        this.openContextMenu();
      }
    }

    if (this.isBackPressed()) {
      this.closeScreen();
    }
  }

  // --- Context menu ---

  private openContextMenu() {
    this.mode = "context";
    this.ctxIndex = 0;
    this.buildContextMenu();
    debugBridge.emit("party_context_menu", { slotIndex: this.slotIndex });
  }

  private buildContextMenu() {
    this.ctxContainer.removeAll(true);

    // Position context menu next to the selected slot
    const menuX = LEFT_W + RIGHT_W - CTX_MENU_W - 4;
    const menuY = SLOT_START_Y + this.slotIndex * SLOT_H;

    // Background
    const bg = this.add.nineslice(
      CTX_MENU_W / 2,
      (CONTEXT_OPTIONS.length * CTX_OPTION_H) / 2 + 4,
      BORDER_TEXTURE,
      undefined,
      CTX_MENU_W,
      CONTEXT_OPTIONS.length * CTX_OPTION_H + 8,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
    );
    this.ctxContainer.add(bg);

    // Options
    for (let i = 0; i < CONTEXT_OPTIONS.length; i++) {
      const label = this.add.text(14, 4 + i * CTX_OPTION_H, CONTEXT_OPTIONS[i], {
        fontSize: "10px",
        color: TEXT_COLOR,
      });
      this.ctxContainer.add(label);
    }

    // Cursor
    const cursor = this.add.text(4, 4, CURSOR_CHAR, {
      fontSize: "10px",
      color: TEXT_COLOR,
    });
    cursor.setName("ctxCursor");
    this.ctxContainer.add(cursor);

    this.ctxContainer.setPosition(menuX, menuY);
    this.ctxContainer.setVisible(true);
  }

  private updateContextMenu() {
    if (this.justPressed("up")) {
      this.ctxIndex = (this.ctxIndex - 1 + CONTEXT_OPTIONS.length) % CONTEXT_OPTIONS.length;
      this.updateCtxCursor();
    }

    if (this.justPressed("down")) {
      this.ctxIndex = (this.ctxIndex + 1) % CONTEXT_OPTIONS.length;
      this.updateCtxCursor();
    }

    if (this.isConfirmPressed()) {
      this.confirmContextOption();
    }

    if (this.isBackPressed()) {
      this.closeContextMenu();
    }
  }

  private updateCtxCursor() {
    const cursor = this.ctxContainer.getByName("ctxCursor") as Phaser.GameObjects.Text;
    if (cursor) {
      cursor.setY(4 + this.ctxIndex * CTX_OPTION_H);
    }
  }

  private confirmContextOption() {
    const option = CONTEXT_OPTIONS[this.ctxIndex];
    switch (option) {
      case "Summary":
        this.mode = "summary";
        this.ctxContainer.setVisible(false);
        debugBridge.emit("party_summary", { slotIndex: this.slotIndex });
        break;
      case "Move":
        this.moveSourceIndex = this.slotIndex;
        this.mode = "move_target";
        this.ctxContainer.setVisible(false);
        this.showMoveIndicator();
        debugBridge.emit("party_move_start", { sourceIndex: this.slotIndex });
        break;
      case "Cancel":
        this.closeContextMenu();
        break;
    }
  }

  private closeContextMenu() {
    this.ctxContainer.setVisible(false);
    this.mode = "browse";
  }

  // --- Summary mode (just closes on back) ---

  private updateSummary() {
    if (this.isBackPressed() || this.isConfirmPressed()) {
      this.mode = "browse";
    }
  }

  // --- Move/reorder mode ---

  private showMoveIndicator() {
    if (this.moveIndicator) {
      this.moveIndicator.destroy();
    }
    const party = session.player.monsters;
    const sourceName = party[this.moveSourceIndex]?.name ?? "?";
    this.moveIndicator = this.add.text(PAD_X, HEIGHT - 14, `Move ${sourceName} where?`, {
      fontSize: "9px",
      color: TEXT_COLOR,
    });
    this.moveIndicator.setDepth(10);
  }

  private updateMoveTarget() {
    const party = session.player.monsters;

    if (this.justPressed("up")) {
      this.slotIndex = (this.slotIndex - 1 + party.length) % party.length;
      this.updateSlotCursor();
      this.updateDetailPanel();
    }

    if (this.justPressed("down")) {
      this.slotIndex = (this.slotIndex + 1) % party.length;
      this.updateSlotCursor();
      this.updateDetailPanel();
    }

    if (this.isConfirmPressed()) {
      this.confirmMoveTarget();
    }

    if (this.isBackPressed()) {
      this.cancelMove();
    }
  }

  private confirmMoveTarget() {
    const party = session.player.monsters;
    const src = this.moveSourceIndex;
    const dst = this.slotIndex;

    if (src >= 0 && src < party.length && dst >= 0 && dst < party.length && src !== dst) {
      // Swap monsters
      const temp = party[src];
      party[src] = party[dst];
      party[dst] = temp;

      debugBridge.emit("party_reorder", { from: src, to: dst });
    }

    this.cleanupMove();
    this.buildSlots();
    this.updateSlotCursor();
    this.updateDetailPanel();
    this.mode = "browse";
  }

  private cancelMove() {
    this.cleanupMove();
    this.mode = "browse";
  }

  private cleanupMove() {
    this.moveSourceIndex = -1;
    if (this.moveIndicator) {
      this.moveIndicator.destroy();
      this.moveIndicator = null;
    }
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
    this.scene.stop("PartyScreen");
    this.scene.resume("PauseMenuScene");
  }
}
