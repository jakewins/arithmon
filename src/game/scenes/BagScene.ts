import { Scene } from "phaser";
import { debugBridge, type DebugStateProvider } from "../debug";
import { session } from "../session";
import { getInventoryItems, removeItem } from "../item/inventory";
import type { ItemDef, ItemEffect } from "../item/item";
import type { Monster } from "../model/Monster";
import { SCREEN_W, SCREEN_H } from "../screen";
import { BODY, withColor, withWrap } from "../ui/textStyle";

const WIDTH = SCREEN_W;
const HEIGHT = SCREEN_H;
const BORDER_TEXTURE = "dialog-border";
const BORDER_SLICE = 3;

const GRAY_COLOR = "#999999";
const CURSOR_CHAR = "\u25b6";

// Key codes
const KEY_UP = 38;
const KEY_DOWN = 40;
const KEY_SPACE = 32;
const KEY_Z = 90;
const KEY_ENTER = 13;
const KEY_ESC = 27;
const KEY_X = 88;
const KEY_BACKSPACE = 8;

// Layout — split the 256-wide canvas: items list on the left, description on the right.
const LEFT_W = 136;
const RIGHT_W = WIDTH - LEFT_W;
const ITEM_START_Y = 18;
const ITEM_H = 10;
const MAX_VISIBLE_ITEMS = Math.floor((HEIGHT - ITEM_START_Y - 6) / ITEM_H);

type BagMode = "browse" | "target";

export class BagScene extends Scene implements DebugStateProvider {
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prevKeys: Record<string, boolean> = {};

  private mode: BagMode = "browse";
  private selected = 0;
  private scrollOffset = 0;
  private targetIndex = 0;

  // Cached item list
  private itemList: { item: ItemDef; count: number }[] = [];

  // UI objects
  private itemLabels: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private descLabel!: Phaser.GameObjects.Text;
  private hintLabel!: Phaser.GameObjects.Text;
  private emptyLabel: Phaser.GameObjects.Text | null = null;
  private messageLabel!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;

  // Target selection UI
  private targetContainer!: Phaser.GameObjects.Container;

  constructor() {
    super("BagScene");
  }

  create() {
    this.selected = 0;
    this.scrollOffset = 0;
    this.targetIndex = 0;
    this.mode = "browse";
    this.prevKeys = {};
    this.itemLabels = [];
    this.emptyLabel = null;

    debugBridge.setScene(this);
    debugBridge.emit("scene_started", { scene: "BagScene" });

    this.events.once("shutdown", () => {
      debugBridge.emit("scene_stopped", { scene: "BagScene" });
    });

    // Background
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0xe8e0d0);

    // Left panel (item list)
    this.add
      .nineslice(
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
      )
      .setDepth(1);

    // Right panel (description)
    this.add
      .nineslice(
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
      )
      .setDepth(1);

    // Title
    this.add.text(6, 4, "BAG", BODY).setDepth(2);

    // Cursor
    this.cursor = this.add.text(4, ITEM_START_Y, CURSOR_CHAR, BODY);
    this.cursor.setDepth(3);

    // Description area (right panel)
    this.descLabel = this.add.text(LEFT_W + 6, 6, "", withWrap(BODY, RIGHT_W - 12));
    this.descLabel.setDepth(2);

    // Message area at bottom of right panel
    this.messageLabel = this.add.text(LEFT_W + 6, HEIGHT - 22, "", BODY);
    this.messageLabel.setDepth(2);

    // Hint
    this.hintLabel = this.add.text(
      LEFT_W + 6,
      HEIGHT - 12,
      "ESC: Back",
      withColor(BODY, GRAY_COLOR),
    );
    this.hintLabel.setDepth(2);

    // Target selection container (hidden initially)
    this.targetContainer = this.add.container(0, 0);
    this.targetContainer.setDepth(20);
    this.targetContainer.setVisible(false);

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

    this.rebuildItemList();
  }

  update() {
    if (this.mode === "browse") {
      this.updateBrowse();
    } else if (this.mode === "target") {
      this.updateTarget();
    }

    for (const [name, key] of Object.entries(this.keys)) {
      this.prevKeys[name] = key.isDown;
    }
  }

  // --- Browse mode ---

  private updateBrowse() {
    if (this.itemList.length === 0) {
      if (this.isBackPressed()) this.closeScreen();
      return;
    }

    if (this.justPressed("up")) {
      this.selected = (this.selected - 1 + this.itemList.length) % this.itemList.length;
      this.scrollToSelected();
      this.updateVisibleItems();
      this.updateDescription();
    }

    if (this.justPressed("down")) {
      this.selected = (this.selected + 1) % this.itemList.length;
      this.scrollToSelected();
      this.updateVisibleItems();
      this.updateDescription();
    }

    if (this.isConfirmPressed()) {
      this.tryUseItem();
    }

    if (this.isBackPressed()) {
      this.closeScreen();
    }
  }

  // --- Item use / target selection ---

  private tryUseItem() {
    const entry = this.itemList[this.selected];
    if (!entry) return;

    if (!entry.item.usableIn.includes("overworld")) {
      this.showMessage("Can't use that here!");
      return;
    }

    const party = session.player.monsters;
    if (party.length === 0) {
      this.showMessage("No monsters in party!");
      return;
    }

    // For revive, only fainted monsters are valid targets
    // For heals, only non-fainted non-full-HP monsters are valid
    const isRevive = entry.item.effects.some((e) => e.type === "revive");
    const hasValidTarget = party.some((m) =>
      isRevive ? m.fainted : !m.fainted && m.currentHp < m.maxHp,
    );

    if (!hasValidTarget) {
      this.showMessage(isRevive ? "No fainted monsters!" : "Everyone is at full HP!");
      return;
    }

    this.openTargetSelection();
  }

  private openTargetSelection() {
    this.mode = "target";
    this.targetIndex = 0;
    this.buildTargetMenu();
  }

  private buildTargetMenu() {
    this.targetContainer.removeAll(true);

    const party = session.player.monsters;
    const menuW = RIGHT_W - 6;
    const menuH = party.length * 12 + 10;
    const menuX = LEFT_W + 3;
    const menuY = 28;

    const bg = this.add.nineslice(
      menuW / 2,
      menuH / 2,
      BORDER_TEXTURE,
      undefined,
      menuW,
      menuH,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
    );
    this.targetContainer.add(bg);

    // Title
    const title = this.add.text(6, 2, "Use on:", BODY);
    this.targetContainer.add(title);

    for (let i = 0; i < party.length; i++) {
      const m = party[i];
      const y = 12 + i * 12;
      const label = this.add.text(
        14,
        y,
        `${m.name} ${m.currentHp}/${m.maxHp}`,
        this.isValidTarget(m) ? BODY : withColor(BODY, GRAY_COLOR),
      );
      this.targetContainer.add(label);
    }

    const cursor = this.add.text(6, 12, CURSOR_CHAR, BODY);
    cursor.setName("targetCursor");
    this.targetContainer.add(cursor);

    this.targetContainer.setPosition(menuX, menuY);
    this.targetContainer.setVisible(true);
  }

  private isValidTarget(m: Monster): boolean {
    const entry = this.itemList[this.selected];
    if (!entry) return false;
    const isRevive = entry.item.effects.some((e) => e.type === "revive");
    return isRevive ? m.fainted : !m.fainted && m.currentHp < m.maxHp;
  }

  private updateTarget() {
    const party = session.player.monsters;

    if (this.justPressed("up")) {
      this.targetIndex = (this.targetIndex - 1 + party.length) % party.length;
      this.updateTargetCursor();
    }

    if (this.justPressed("down")) {
      this.targetIndex = (this.targetIndex + 1) % party.length;
      this.updateTargetCursor();
    }

    if (this.isConfirmPressed()) {
      this.confirmTarget();
    }

    if (this.isBackPressed()) {
      this.closeTargetSelection();
    }
  }

  private updateTargetCursor() {
    const cursor = this.targetContainer.getByName("targetCursor") as Phaser.GameObjects.Text;
    if (cursor) cursor.setY(12 + this.targetIndex * 12);
  }

  private confirmTarget() {
    const party = session.player.monsters;
    const target = party[this.targetIndex];
    if (!target || !this.isValidTarget(target)) {
      this.showMessage("Can't use on that monster!");
      return;
    }

    const entry = this.itemList[this.selected];
    if (!entry) return;

    // Apply effects
    const messages: string[] = [];
    for (const effect of entry.item.effects) {
      messages.push(this.applyEffect(effect, target));
    }

    // Remove item from inventory
    removeItem(session.player.inventory, entry.item.slug);

    debugBridge.emit("bag_use_item", {
      item: entry.item.slug,
      target: target.slug,
      targetIndex: this.targetIndex,
    });

    this.closeTargetSelection();
    this.showMessage(messages.join(" "));
    this.rebuildItemList();
  }

  private applyEffect(effect: ItemEffect, target: Monster): string {
    switch (effect.type) {
      case "heal_hp": {
        const before = target.currentHp;
        target.currentHp = Math.min(target.maxHp, target.currentHp + effect.amount);
        const healed = target.currentHp - before;
        return `${target.name} recovered ${healed} HP!`;
      }
      case "heal_hp_percent": {
        const before = target.currentHp;
        const amount = Math.floor(target.maxHp * (effect.percent / 100));
        target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
        const healed = target.currentHp - before;
        return `${target.name} recovered ${healed} HP!`;
      }
      case "revive": {
        const restored = Math.floor(target.maxHp * (effect.hp_percent / 100));
        target.currentHp = restored;
        return `${target.name} was revived with ${restored} HP!`;
      }
      case "capture":
        return "Can't use that here!";
    }
  }

  private closeTargetSelection() {
    this.targetContainer.setVisible(false);
    this.mode = "browse";
  }

  // --- Item list ---

  private rebuildItemList() {
    this.itemList = getInventoryItems(session.player.inventory);

    // Clear old labels
    for (const label of this.itemLabels) label.destroy();
    this.itemLabels = [];
    if (this.emptyLabel) {
      this.emptyLabel.destroy();
      this.emptyLabel = null;
    }

    if (this.itemList.length === 0) {
      this.emptyLabel = this.add.text(
        14,
        ITEM_START_Y + 4,
        "No items.",
        withColor(BODY, GRAY_COLOR),
      );
      this.emptyLabel.setDepth(2);
      this.cursor.setVisible(false);
      this.descLabel.setText("");
      return;
    }

    // Clamp selection
    if (this.selected >= this.itemList.length) {
      this.selected = Math.max(0, this.itemList.length - 1);
    }
    this.scrollToSelected();
    this.updateVisibleItems();
    this.updateDescription();
  }

  private scrollToSelected() {
    if (this.selected < this.scrollOffset) {
      this.scrollOffset = this.selected;
    } else if (this.selected >= this.scrollOffset + MAX_VISIBLE_ITEMS) {
      this.scrollOffset = this.selected - MAX_VISIBLE_ITEMS + 1;
    }
  }

  private updateVisibleItems() {
    for (const label of this.itemLabels) label.destroy();
    this.itemLabels = [];

    const end = Math.min(this.scrollOffset + MAX_VISIBLE_ITEMS, this.itemList.length);
    for (let i = this.scrollOffset; i < end; i++) {
      const { item, count } = this.itemList[i];
      const displayIdx = i - this.scrollOffset;
      const y = ITEM_START_Y + displayIdx * ITEM_H;
      const usable = item.usableIn.includes("overworld");
      const label = this.add.text(
        14,
        y,
        `${item.name} x${count}`,
        usable ? BODY : withColor(BODY, GRAY_COLOR),
      );
      label.setDepth(2);
      this.itemLabels.push(label);
    }

    // Update cursor position
    const cursorDisplayIdx = this.selected - this.scrollOffset;
    this.cursor.setVisible(true);
    this.cursor.setY(ITEM_START_Y + cursorDisplayIdx * ITEM_H);

    // Scroll indicators
    // (Simple approach: no separate indicator objects, just visual hint in list)
  }

  private updateDescription() {
    const entry = this.itemList[this.selected];
    if (!entry) {
      this.descLabel.setText("");
      return;
    }

    const { item } = entry;
    const usable = item.usableIn.includes("overworld");
    this.descLabel.setText(
      `${item.name}\n\n${item.description}${usable ? "\n\n[Use with ENTER]" : "\n\n(Not usable here)"}`,
    );
  }

  // --- Messages ---

  private showMessage(text: string) {
    this.messageLabel.setText(text);
    if (this.messageTimer) this.messageTimer.destroy();
    this.messageTimer = this.time.delayedCall(2500, () => {
      this.messageLabel.setText("");
    });
  }

  // --- Close ---

  private closeScreen() {
    this.scene.stop("BagScene");
    this.scene.resume("PauseMenuScene");
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

  // --- Debug ---

  getDebugState(): Record<string, unknown> {
    return {
      bagScreen: {
        mode: this.mode,
        selected: this.selected,
        targetIndex: this.targetIndex,
        itemCount: this.itemList.length,
      },
    };
  }
}
