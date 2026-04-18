import { Scene } from "phaser";
import { debugBridge } from "../debug";
import { session } from "../session";

const WIDTH = 320;
const HEIGHT = 240;
const BORDER_TEXTURE = "dialog-border";
const BORDER_SLICE = 3;

const PANEL_W = 100;
const PANEL_X = WIDTH - PANEL_W;
const PAD_X = 12;
const PAD_Y = 10;
const OPTION_H = 16;
const TEXT_COLOR = "#1a1a1a";
const CURSOR_CHAR = "\u25b6";

// Key codes
const KEY_UP = 38;
const KEY_DOWN = 40;
const KEY_SPACE = 32;
const KEY_Z = 90;
const KEY_ENTER = 13;
const KEY_ESC = 27;

interface MenuOption {
  label: string;
  visible: () => boolean;
  action: () => void;
}

export class PauseMenuScene extends Scene {
  private overlay!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.NineSlice;
  private labels: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private selected = 0;
  private options: MenuOption[] = [];
  private visibleOptions: MenuOption[] = [];

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prevKeys: Record<string, boolean> = {};

  private stubMessage: Phaser.GameObjects.Text | null = null;
  private stubTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super("PauseMenuScene");
  }

  create() {
    this.selected = 0;
    this.labels = [];
    this.stubMessage = null;
    this.stubTimer = null;

    this.options = [
      {
        label: "Tuxemon",
        visible: () => session.player.monsters.length > 0,
        action: () => this.showStub("No party screen yet!"),
      },
      {
        label: "Bag",
        visible: () => true,
        action: () => this.showStub("No bag screen yet!"),
      },
      {
        label: "Save",
        visible: () => true,
        action: () => this.showStub("Saved!"),
      },
      {
        label: "Close",
        visible: () => true,
        action: () => this.closeMenu(),
      },
    ];

    this.visibleOptions = this.options.filter((o) => o.visible());

    // Semi-transparent overlay covering the full screen
    this.overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.4);
    this.overlay.setDepth(200);

    // Panel height sized to visible options
    const panelH = this.visibleOptions.length * OPTION_H + PAD_Y * 2;
    const panelCenterX = PANEL_X + PANEL_W / 2;
    const panelCenterY = PAD_Y + panelH / 2;

    this.panel = this.add.nineslice(
      panelCenterX,
      panelCenterY,
      BORDER_TEXTURE,
      undefined,
      PANEL_W,
      panelH,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
    );
    this.panel.setDepth(201);

    // Option labels
    for (let i = 0; i < this.visibleOptions.length; i++) {
      const label = this.add.text(
        PANEL_X + PAD_X + 14,
        PAD_Y + PAD_Y + i * OPTION_H,
        this.visibleOptions[i].label,
        {
          fontSize: "11px",
          color: TEXT_COLOR,
        },
      );
      label.setDepth(202);
      this.labels.push(label);
    }

    // Cursor
    this.cursor = this.add.text(PANEL_X + PAD_X, PAD_Y + PAD_Y, CURSOR_CHAR, {
      fontSize: "11px",
      color: TEXT_COLOR,
    });
    this.cursor.setDepth(202);

    // Keys
    this.keys = {
      up: this.input.keyboard!.addKey(KEY_UP),
      down: this.input.keyboard!.addKey(KEY_DOWN),
      confirm: this.input.keyboard!.addKey(KEY_SPACE),
      confirmZ: this.input.keyboard!.addKey(KEY_Z),
      confirmEnter: this.input.keyboard!.addKey(KEY_ENTER),
      back: this.input.keyboard!.addKey(KEY_ESC),
    };
    this.prevKeys = {};

    debugBridge.emit("pause_menu_opened", {});
  }

  update() {
    const justPressed = (name: string): boolean => {
      return this.keys[name].isDown && !this.prevKeys[name];
    };

    if (justPressed("up")) {
      this.selected = (this.selected - 1 + this.visibleOptions.length) % this.visibleOptions.length;
      this.updateCursor();
    }

    if (justPressed("down")) {
      this.selected = (this.selected + 1) % this.visibleOptions.length;
      this.updateCursor();
    }

    if (justPressed("confirm") || justPressed("confirmZ") || justPressed("confirmEnter")) {
      this.visibleOptions[this.selected].action();
    }

    if (justPressed("back")) {
      this.closeMenu();
    }

    // Update prev key state
    for (const [name, key] of Object.entries(this.keys)) {
      this.prevKeys[name] = key.isDown;
    }
  }

  private updateCursor() {
    this.cursor.setY(PAD_Y + PAD_Y + this.selected * OPTION_H);
  }

  private showStub(message: string) {
    // Clear any existing stub
    if (this.stubMessage) {
      this.stubMessage.destroy();
      this.stubMessage = null;
    }
    if (this.stubTimer) {
      this.stubTimer.destroy();
      this.stubTimer = null;
    }

    this.stubMessage = this.add.text(PANEL_X + PAD_X, HEIGHT - 30, message, {
      fontSize: "11px",
      color: TEXT_COLOR,
      backgroundColor: "#ffffff",
      padding: { x: 4, y: 2 },
    });
    this.stubMessage.setDepth(203);

    debugBridge.emit("menu_option_selected", { option: this.visibleOptions[this.selected].label });

    this.stubTimer = this.time.delayedCall(1500, () => {
      if (this.stubMessage) {
        this.stubMessage.destroy();
        this.stubMessage = null;
      }
    });
  }

  private closeMenu() {
    debugBridge.emit("pause_menu_closed", {});
    this.scene.stop("PauseMenuScene");
    this.scene.resume("OverworldScene");
  }
}
