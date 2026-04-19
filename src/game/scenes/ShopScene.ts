import { Scene } from "phaser";
import { type ShopInventory } from "../data/shops";
import { ITEMS } from "../data/items";
import { session } from "../session";
import { addItem, removeItem, getInventoryItems } from "../item/inventory";
import { debugBridge, type DebugStateProvider } from "../debug";

const WIDTH = 320;
const HEIGHT = 240;
const BORDER_TEXTURE = "dialog-border";
const BORDER_SLICE = 3;
const TEXT_COLOR = "#1a1a1a";
const GRAY_COLOR = "#999999";
const CURSOR_CHAR = "\u25b6";

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

type ShopTab = "buy" | "sell";

export class ShopScene extends Scene implements DebugStateProvider {
  private shop!: ShopInventory;
  private callerScene!: string;
  private tab: ShopTab = "buy";
  private selected = 0;

  // UI elements
  private panel!: Phaser.GameObjects.NineSlice;
  private tabLabels: Phaser.GameObjects.Text[] = [];
  private itemLabels: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private goldLabel!: Phaser.GameObjects.Text;
  private messageLabel!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;

  // Input
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prevKeys: Record<string, boolean> = {};

  constructor() {
    super("ShopScene");
  }

  init(data: { shop: ShopInventory; callerScene: string }) {
    this.shop = data.shop;
    this.callerScene = data.callerScene;
    this.tab = "buy";
    this.selected = 0;
  }

  create() {
    debugBridge.setScene(this);
    debugBridge.emit("scene_started", { scene: "ShopScene" });

    this.events.once("shutdown", () => {
      debugBridge.emit("scene_stopped", { scene: "ShopScene" });
    });

    // Background
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0xe8e0d0);

    // Main panel
    this.panel = this.add.nineslice(
      WIDTH / 2,
      HEIGHT / 2,
      BORDER_TEXTURE,
      undefined,
      WIDTH - 16,
      HEIGHT - 16,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
    );
    this.panel.setDepth(1);

    // Tab labels
    const buyTab = this.add.text(24, 16, "BUY", { fontSize: "11px", color: TEXT_COLOR });
    buyTab.setDepth(2);
    const sellTab = this.add.text(70, 16, "SELL", { fontSize: "11px", color: GRAY_COLOR });
    sellTab.setDepth(2);
    this.tabLabels = [buyTab, sellTab];

    // Gold display
    this.goldLabel = this.add.text(WIDTH - 24, 16, "", {
      fontSize: "10px",
      color: TEXT_COLOR,
    });
    this.goldLabel.setOrigin(1, 0);
    this.goldLabel.setDepth(2);

    // Cursor
    this.cursor = this.add.text(16, 36, CURSOR_CHAR, { fontSize: "10px", color: TEXT_COLOR });
    this.cursor.setDepth(2);

    // Message area at bottom
    this.messageLabel = this.add.text(24, HEIGHT - 28, "", {
      fontSize: "9px",
      color: TEXT_COLOR,
    });
    this.messageLabel.setDepth(2);

    // Hint
    const hint = this.add.text(WIDTH - 24, HEIGHT - 28, "ESC: Close", {
      fontSize: "8px",
      color: GRAY_COLOR,
    });
    hint.setOrigin(1, 0);
    hint.setDepth(2);

    // Setup input
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
    this.prevKeys = {};

    this.rebuildItemList();
    this.updateGold();
  }

  update() {
    // Navigation
    if (this.justPressed("left") || this.justPressed("right")) {
      this.tab = this.tab === "buy" ? "sell" : "buy";
      this.selected = 0;
      this.rebuildItemList();
      this.updateTabs();
    }

    const itemCount = this.itemLabels.length;

    if (this.justPressed("up") && itemCount > 0) {
      this.selected = (this.selected - 1 + itemCount) % itemCount;
      this.updateCursor();
    }

    if (this.justPressed("down") && itemCount > 0) {
      this.selected = (this.selected + 1) % itemCount;
      this.updateCursor();
    }

    if (this.isConfirmPressed() && itemCount > 0) {
      if (this.tab === "buy") {
        this.buyItem();
      } else {
        this.sellItem();
      }
    }

    if (this.isBackPressed()) {
      this.closeShop();
    }

    // Track key state
    for (const [name, key] of Object.entries(this.keys)) {
      this.prevKeys[name] = key.isDown;
    }
  }

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

  private rebuildItemList() {
    // Clear old labels
    for (const label of this.itemLabels) label.destroy();
    this.itemLabels = [];

    const startY = 36;
    const lineH = 14;

    if (this.tab === "buy") {
      for (let i = 0; i < this.shop.items.length; i++) {
        const entry = this.shop.items[i];
        const def = ITEMS[entry.slug];
        if (!def) continue;
        const canAfford = session.player.money >= entry.price;
        const label = this.add.text(28, startY + i * lineH, `${def.name}  ${entry.price}G`, {
          fontSize: "10px",
          color: canAfford ? TEXT_COLOR : GRAY_COLOR,
        });
        label.setDepth(2);
        this.itemLabels.push(label);
      }
    } else {
      const playerItems = getInventoryItems(session.player.inventory);
      for (let i = 0; i < playerItems.length; i++) {
        const { item, count } = playerItems[i];
        const sellPrice = Math.floor(item.buyPrice * this.shop.sellMultiplier);
        const label = this.add.text(
          28,
          startY + i * lineH,
          `${item.name} x${count}  ${sellPrice}G`,
          { fontSize: "10px", color: TEXT_COLOR },
        );
        label.setDepth(2);
        this.itemLabels.push(label);
      }
    }

    // Clamp selection
    if (this.selected >= this.itemLabels.length) {
      this.selected = Math.max(0, this.itemLabels.length - 1);
    }

    this.updateCursor();
    this.updateTabs();
  }

  private updateCursor() {
    if (this.itemLabels.length === 0) {
      this.cursor.setVisible(false);
      return;
    }
    this.cursor.setVisible(true);
    const y = this.itemLabels[this.selected].y;
    this.cursor.setY(y);
  }

  private updateTabs() {
    this.tabLabels[0].setColor(this.tab === "buy" ? TEXT_COLOR : GRAY_COLOR);
    this.tabLabels[1].setColor(this.tab === "sell" ? TEXT_COLOR : GRAY_COLOR);
  }

  private updateGold() {
    this.goldLabel.setText(`${session.player.money}G`);
  }

  private showMessage(text: string) {
    this.messageLabel.setText(text);
    if (this.messageTimer) this.messageTimer.destroy();
    this.messageTimer = this.time.delayedCall(2000, () => {
      this.messageLabel.setText("");
    });
  }

  private buyItem() {
    const entry = this.shop.items[this.selected];
    if (!entry) return;

    const def = ITEMS[entry.slug];
    if (!def) return;

    if (session.player.money < entry.price) {
      this.showMessage("Not enough gold!");
      return;
    }

    session.player.money -= entry.price;
    addItem(session.player.inventory, entry.slug);
    this.showMessage(`Bought ${def.name}!`);
    this.updateGold();
    this.rebuildItemList();

    debugBridge.emit("shop_buy", { item: entry.slug, price: entry.price });
  }

  private sellItem() {
    const playerItems = getInventoryItems(session.player.inventory);
    const entry = playerItems[this.selected];
    if (!entry) return;

    const sellPrice = Math.floor(entry.item.buyPrice * this.shop.sellMultiplier);
    if (!removeItem(session.player.inventory, entry.item.slug)) return;

    session.player.money += sellPrice;
    this.showMessage(`Sold ${entry.item.name} for ${sellPrice}G!`);
    this.updateGold();
    this.rebuildItemList();

    debugBridge.emit("shop_sell", { item: entry.item.slug, price: sellPrice });
  }

  private closeShop() {
    this.scene.stop("ShopScene");
    this.scene.resume(this.callerScene);
  }

  getDebugState(): Record<string, unknown> {
    return {
      tab: this.tab,
      selected: this.selected,
      shopItems: this.shop.items,
    };
  }
}
