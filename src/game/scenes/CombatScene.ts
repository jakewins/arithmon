import { Scene } from "phaser";
import { CombatMachine, CombatEvent, MAX_DARK_POWER } from "../combat/machine";
import { Monster } from "../model/Monster";
import { TechniqueDef } from "../data/techniques";
import { debugBridge, type DebugCommandHandler, type DebugStateProvider } from "../debug";

const WIDTH = 320;
const HEIGHT = 240;
const BOX_H = 64;
const BOX_Y = HEIGHT - BOX_H;
const HP_BAR_W = 80;
const HP_BAR_H = 6;
const DP_PIP_SIZE = 8;
const DP_PIP_GAP = 3;
const BORDER_TEXTURE = "dialog-border";
const BORDER_SLICE = 3;

// Layout: left panel ~60%, right panel ~40%
const LEFT_W = 192;
const RIGHT_W = WIDTH - LEFT_W;
const PAD_X = 8;
const PAD_Y = 6;
const OPTION_H = 14;
const TEXT_COLOR = "#1a1a1a";
const DISABLED_COLOR = "#999999";
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

type MenuMode = "hidden" | "main" | "techniques";

// 2x2 main menu layout
const MAIN_MENU_ITEMS = [
  ["FIGHT", "TUXEMON"],
  ["ITEM", "RUN"],
] as const;
const MAIN_ROWS = MAIN_MENU_ITEMS.length;
const MAIN_COLS = MAIN_MENU_ITEMS[0].length;

export class CombatScene extends Scene implements DebugStateProvider, DebugCommandHandler {
  private machine!: CombatMachine;
  private enemySprite!: Phaser.GameObjects.Image;
  private playerSprite!: Phaser.GameObjects.Image;
  private enemyHpBar!: Phaser.GameObjects.Rectangle;
  private playerHpBar!: Phaser.GameObjects.Rectangle;
  private enemyNameText!: Phaser.GameObjects.Text;
  private playerNameText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private dpPips: Phaser.GameObjects.Rectangle[] = [];
  private eventQueue: CombatEvent[] = [];
  private processing = false;

  // Menu panels
  private leftBorder!: Phaser.GameObjects.NineSlice;
  private rightBorder!: Phaser.GameObjects.NineSlice;

  // Main menu (2x2 grid)
  private mainMenuLabels: Phaser.GameObjects.Text[] = [];
  private mainCursor!: Phaser.GameObjects.Text;
  private mainRow = 0;
  private mainCol = 0;

  // Technique submenu
  private techLabels: Phaser.GameObjects.Text[] = [];
  private techCursor!: Phaser.GameObjects.Text;
  private techSelected = 0;
  private techRechargeLabel!: Phaser.GameObjects.Text;

  private menuMode: MenuMode = "hidden";

  // Key state for edge detection
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prevKeys: Record<string, boolean> = {};

  constructor() {
    super("CombatScene");
  }

  preload() {
    // Battle sprites are preloaded by OverworldScene, but load if missing (e.g. direct launch)
    if (!this.textures.exists("rockitten-battle")) {
      this.load.spritesheet("rockitten-battle", "assets/sprites/rockitten-sheet.png", {
        frameWidth: 64,
        frameHeight: 44,
      });
    }
    for (const slug of ["dollfin", "ignibus", "memnomnom", "budaye", "grintot"]) {
      if (!this.textures.exists(`${slug}-battle`)) {
        this.load.spritesheet(`${slug}-battle`, `assets/sprites/battle/${slug}-sheet.png`, {
          frameWidth: 64,
          frameHeight: 44,
        });
      }
    }
    if (!this.textures.exists(BORDER_TEXTURE)) {
      this.load.image(BORDER_TEXTURE, "assets/ui/dialog-border.png");
    }
  }

  init(data: { playerMonster: Monster; enemyMonster: Monster }) {
    this.machine = new CombatMachine(data.playerMonster, data.enemyMonster);
    this.eventQueue = [];
    this.processing = false;
    this.menuMode = "hidden";
    this.mainRow = 0;
    this.mainCol = 0;
    this.techSelected = 0;
    this.prevKeys = {};
  }

  create() {
    this.cameras.main.setBackgroundColor("#2a4a3a");

    const enemyTexture = `${this.machine.enemy.slug}-battle`;
    const playerTexture = `${this.machine.player.slug}-battle`;

    // Enemy sprite (front) — upper right
    this.enemySprite = this.add.image(WIDTH - 72, 48, enemyTexture, 1);
    this.enemySprite.setScale(2);

    // Player sprite (back) — lower left
    this.playerSprite = this.add.image(72, BOX_Y - 48, playerTexture, 0);
    this.playerSprite.setScale(2);

    // Enemy HP bar + name
    const enemyHpX = WIDTH - 72 - HP_BAR_W / 2;
    const enemyHpY = 88;
    this.enemyNameText = this.add.text(enemyHpX, enemyHpY - 12, "", {
      fontSize: "10px",
      color: "#ffffff",
    });
    this.add.rectangle(enemyHpX + HP_BAR_W / 2, enemyHpY + 2, HP_BAR_W, HP_BAR_H, 0x333333);
    this.enemyHpBar = this.add.rectangle(
      enemyHpX + HP_BAR_W / 2,
      enemyHpY + 2,
      HP_BAR_W,
      HP_BAR_H,
      0x44cc44,
    );

    // Player HP bar + name
    const playerHpX = 72 - HP_BAR_W / 2;
    const playerHpY = BOX_Y - 88;
    this.playerNameText = this.add.text(playerHpX, playerHpY - 12, "", {
      fontSize: "10px",
      color: "#ffffff",
    });
    this.add.rectangle(playerHpX + HP_BAR_W / 2, playerHpY + 2, HP_BAR_W, HP_BAR_H, 0x333333);
    this.playerHpBar = this.add.rectangle(
      playerHpX + HP_BAR_W / 2,
      playerHpY + 2,
      HP_BAR_W,
      HP_BAR_H,
      0x44cc44,
    );

    // Dark Power pips — below player HP bar
    const dpStartX = 72 - HP_BAR_W / 2;
    const dpY = BOX_Y - 72;
    this.add.text(dpStartX, dpY - 10, "DP", { fontSize: "8px", color: "#bb66ff" });
    this.dpPips = [];
    for (let i = 0; i < MAX_DARK_POWER; i++) {
      const pip = this.add
        .rectangle(
          dpStartX + i * (DP_PIP_SIZE + DP_PIP_GAP) + DP_PIP_SIZE / 2 + 16,
          dpY - 5,
          DP_PIP_SIZE,
          DP_PIP_SIZE,
          0xbb66ff,
        )
        .setStrokeStyle(1, 0x8833cc);
      this.dpPips.push(pip);
    }

    // --- Two-panel bottom bar ---
    // Left panel: prompt/message area
    this.leftBorder = this.add.nineslice(
      LEFT_W / 2,
      BOX_Y + BOX_H / 2,
      BORDER_TEXTURE,
      undefined,
      LEFT_W,
      BOX_H,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
    );
    this.leftBorder.setDepth(100);

    // Right panel: menu area
    this.rightBorder = this.add.nineslice(
      LEFT_W + RIGHT_W / 2,
      BOX_Y + BOX_H / 2,
      BORDER_TEXTURE,
      undefined,
      RIGHT_W,
      BOX_H,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
    );
    this.rightBorder.setDepth(100);

    // Message text in left panel
    this.messageText = this.add.text(PAD_X, BOX_Y + PAD_Y, "", {
      fontSize: "11px",
      color: TEXT_COLOR,
      wordWrap: { width: LEFT_W - PAD_X * 2 },
    });
    this.messageText.setDepth(101);

    // --- Main menu labels (2x2 grid in right panel) ---
    this.mainMenuLabels = [];
    const colW = (RIGHT_W - PAD_X * 2) / MAIN_COLS;
    for (let r = 0; r < MAIN_ROWS; r++) {
      for (let c = 0; c < MAIN_COLS; c++) {
        const x = LEFT_W + PAD_X + 12 + c * colW;
        const y = BOX_Y + PAD_Y + r * (OPTION_H + 6);
        const label = this.add.text(x, y, MAIN_MENU_ITEMS[r][c], {
          fontSize: "11px",
          color: TEXT_COLOR,
        });
        label.setDepth(101);
        this.mainMenuLabels.push(label);
      }
    }
    this.mainCursor = this.add.text(0, 0, CURSOR_CHAR, {
      fontSize: "11px",
      color: TEXT_COLOR,
    });
    this.mainCursor.setDepth(101);

    // --- Technique submenu labels (vertical list in right panel) ---
    // Created dynamically, but we pre-create the cursor
    this.techCursor = this.add.text(0, 0, CURSOR_CHAR, {
      fontSize: "11px",
      color: TEXT_COLOR,
    });
    this.techCursor.setDepth(101);

    // Recharge label (shown at bottom of technique list)
    this.techRechargeLabel = this.add.text(0, 0, "", {
      fontSize: "11px",
      color: "#bb66ff",
    });
    this.techRechargeLabel.setDepth(101);

    // Setup keyboard
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

    this.setMenuMode("hidden");
    this.updateHpBars();
    this.updateDpPips();
    this.updateNameLabels();

    // Start combat
    this.queueEvents(this.machine.intro());

    debugBridge.setScene(this);
    debugBridge.emit("scene_started", { scene: "CombatScene" });

    this.events.once("shutdown", () => {
      debugBridge.emit("scene_stopped", { scene: "CombatScene" });
    });
  }

  update() {
    if (this.menuMode === "main") {
      this.updateMainMenu();
    } else if (this.menuMode === "techniques") {
      this.updateTechMenu();
    }

    // Update prev key state
    for (const [name, key] of Object.entries(this.keys)) {
      this.prevKeys[name] = key.isDown;
    }
  }

  // --- Debug command handlers ---

  debugSelectChoice(index: number): void {
    if (this.menuMode === "main") {
      const row = Math.floor(index / MAIN_COLS);
      const col = index % MAIN_COLS;
      if (row < MAIN_ROWS && col < MAIN_COLS) {
        this.mainRow = row;
        this.mainCol = col;
        this.confirmMainMenu();
      }
    } else if (this.menuMode === "techniques") {
      const totalOptions = this.getVisibleTechniques().length + 1; // +1 for recharge
      if (index >= 0 && index < totalOptions) {
        this.techSelected = index;
        this.confirmTechMenu();
      }
    }
  }

  debugIsBlocking(): boolean {
    return this.processing;
  }

  getDebugState(): Record<string, unknown> {
    const m = this.machine;
    const monsterSnapshot = (mon: Monster) => ({
      slug: mon.slug,
      level: mon.level,
      currentHp: mon.currentHp,
      maxHp: mon.maxHp,
    });
    return {
      combat: {
        state: m.state,
        outcome: m.outcome,
        darkPower: m.darkPower,
        maxDarkPower: m.maxDarkPower,
        menuMode: this.menuMode,
        playerMonster: monsterSnapshot(m.player),
        enemyMonster: monsterSnapshot(m.enemy),
      },
    };
  }

  // --- Key edge detection ---

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

  // --- Menu mode management ---

  private setMenuMode(mode: MenuMode) {
    this.menuMode = mode;

    // Hide everything first
    for (const label of this.mainMenuLabels) label.setVisible(false);
    this.mainCursor.setVisible(false);
    this.clearTechLabels();
    this.techCursor.setVisible(false);
    this.techRechargeLabel.setVisible(false);

    if (mode === "main") {
      this.messageText.setText(`What will ${this.machine.player.name} do?`);
      for (const label of this.mainMenuLabels) label.setVisible(true);
      this.mainCursor.setVisible(true);
      this.updateMainCursorPosition();
      debugBridge.emit("combat_menu", { mode: "main" });
    } else if (mode === "techniques") {
      this.buildTechLabels();
      this.techCursor.setVisible(true);
      this.updateTechCursorPosition();
      debugBridge.emit("combat_menu", { mode: "techniques" });
    }
  }

  // --- Main menu (2x2 grid) ---

  private updateMainMenu() {
    if (this.justPressed("up")) {
      this.mainRow = (this.mainRow - 1 + MAIN_ROWS) % MAIN_ROWS;
      this.updateMainCursorPosition();
    }
    if (this.justPressed("down")) {
      this.mainRow = (this.mainRow + 1) % MAIN_ROWS;
      this.updateMainCursorPosition();
    }
    if (this.justPressed("left")) {
      this.mainCol = (this.mainCol - 1 + MAIN_COLS) % MAIN_COLS;
      this.updateMainCursorPosition();
    }
    if (this.justPressed("right")) {
      this.mainCol = (this.mainCol + 1) % MAIN_COLS;
      this.updateMainCursorPosition();
    }

    if (this.isConfirmPressed()) {
      this.confirmMainMenu();
    }
  }

  private updateMainCursorPosition() {
    const idx = this.mainRow * MAIN_COLS + this.mainCol;
    const label = this.mainMenuLabels[idx];
    this.mainCursor.setPosition(label.x - 12, label.y);
  }

  private confirmMainMenu() {
    const item = MAIN_MENU_ITEMS[this.mainRow][this.mainCol];
    switch (item) {
      case "FIGHT":
        if (!this.machine.canFight() && this.machine.darkPower >= this.machine.maxDarkPower) {
          this.messageText.setText("No moves available!");
          return;
        }
        this.techSelected = 0;
        this.setMenuMode("techniques");
        break;
      case "TUXEMON":
        this.messageText.setText("Not yet available.");
        break;
      case "ITEM":
        this.messageText.setText("No items.");
        break;
      case "RUN":
        this.setMenuMode("hidden");
        this.queueEvents(this.machine.submitAction({ type: "run" }));
        break;
    }
  }

  // --- Technique submenu ---

  private getVisibleTechniques(): TechniqueDef[] {
    return this.machine.player.techniques;
  }

  private buildTechLabels() {
    this.clearTechLabels();
    const techniques = this.getVisibleTechniques();
    const baseX = LEFT_W + PAD_X + 12;
    const baseY = BOX_Y + PAD_Y;

    for (let i = 0; i < techniques.length; i++) {
      const tech = techniques[i];
      const canAfford = this.machine.canAfford(tech);
      const label = this.add.text(baseX, baseY + i * OPTION_H, `${tech.name} ${tech.dpCost}DP`, {
        fontSize: "11px",
        color: canAfford ? TEXT_COLOR : DISABLED_COLOR,
      });
      label.setDepth(101);
      this.techLabels.push(label);
    }

    // Recharge option at bottom
    const rechargeY = baseY + techniques.length * OPTION_H;
    const showRecharge = this.machine.darkPower < this.machine.maxDarkPower;
    this.techRechargeLabel.setPosition(baseX, rechargeY);
    this.techRechargeLabel.setText("\u26a1 RECHARGE");
    this.techRechargeLabel.setVisible(showRecharge);

    // Update message to show technique prompt
    this.messageText.setText("Choose a technique:");
  }

  private clearTechLabels() {
    for (const label of this.techLabels) label.destroy();
    this.techLabels = [];
  }

  private getTechOptionCount(): number {
    const techniques = this.getVisibleTechniques();
    const hasRecharge = this.machine.darkPower < this.machine.maxDarkPower;
    return techniques.length + (hasRecharge ? 1 : 0);
  }

  private updateTechMenu() {
    const optionCount = this.getTechOptionCount();

    if (this.justPressed("up")) {
      this.techSelected = (this.techSelected - 1 + optionCount) % optionCount;
      this.updateTechCursorPosition();
    }
    if (this.justPressed("down")) {
      this.techSelected = (this.techSelected + 1) % optionCount;
      this.updateTechCursorPosition();
    }

    if (this.isBackPressed()) {
      this.techSelected = 0;
      this.setMenuMode("main");
      return;
    }

    if (this.isConfirmPressed()) {
      this.confirmTechMenu();
    }
  }

  private updateTechCursorPosition() {
    const baseX = LEFT_W + PAD_X;
    const baseY = BOX_Y + PAD_Y;
    this.techCursor.setPosition(baseX, baseY + this.techSelected * OPTION_H);
  }

  private confirmTechMenu() {
    const techniques = this.getVisibleTechniques();

    if (this.techSelected < techniques.length) {
      const tech = techniques[this.techSelected];
      if (!this.machine.canAfford(tech)) {
        this.messageText.setText("Not enough Dark Power!");
        return;
      }
      this.setMenuMode("hidden");
      this.queueEvents(this.machine.submitAction({ type: "fight", technique: tech.slug }));
    } else {
      // Recharge selected
      this.onRecharge();
    }
  }

  // --- HP / DP / Labels ---

  private updateNameLabels() {
    const p = this.machine.player;
    const e = this.machine.enemy;
    this.playerNameText.setText(`${p.name} Lv${p.level}`);
    this.enemyNameText.setText(`${e.name} Lv${e.level}`);
  }

  private updateHpBars() {
    const pRatio = this.machine.player.currentHp / this.machine.player.maxHp;
    const eRatio = this.machine.enemy.currentHp / this.machine.enemy.maxHp;
    this.playerHpBar.setScale(Math.max(0, pRatio), 1);
    this.enemyHpBar.setScale(Math.max(0, eRatio), 1);
    this.playerHpBar.setFillStyle(this.hpColor(pRatio));
    this.enemyHpBar.setFillStyle(this.hpColor(eRatio));
  }

  private hpColor(ratio: number): number {
    if (ratio > 0.5) return 0x44cc44;
    if (ratio > 0.2) return 0xcccc44;
    return 0xcc4444;
  }

  private updateDpPips() {
    for (let i = 0; i < this.dpPips.length; i++) {
      if (i < this.machine.darkPower) {
        this.dpPips[i].setFillStyle(0xbb66ff);
      } else {
        this.dpPips[i].setFillStyle(0x332244);
      }
    }
  }

  // --- Recharge ---

  private onRecharge() {
    if (this.processing) return;
    if (this.machine.darkPower >= this.machine.maxDarkPower) return;
    this.setMenuMode("hidden");

    this.scene.pause();
    this.scene.launch("MathProblemScene", { returnScene: "CombatScene" });

    this.scene.get("MathProblemScene").events.once("shutdown", () => {
      const mathScene = this.scene.get("MathProblemScene");
      const correct = mathScene.data.get("correct") as boolean;
      if (correct) {
        this.machine.rechargeDarkPower();
        this.messageText.setText("Dark Power recharged!");
      } else {
        this.messageText.setText("Recharge failed...");
      }
      this.updateDpPips();
      this.time.delayedCall(1000, () => {
        if (this.machine.state === "DECISION") {
          this.setMenuMode("main");
        }
      });
    });
  }

  // --- Event queue ---

  private queueEvents(events: CombatEvent[]) {
    this.eventQueue.push(...events);
    if (!this.processing) {
      this.processNextEvent();
    }
  }

  private processNextEvent() {
    if (this.eventQueue.length === 0) {
      this.processing = false;
      this.updateHpBars();
      if (this.machine.state === "DECISION") {
        this.setMenuMode("main");
      } else if (this.machine.state === "END") {
        this.showEndMessage();
      }
      return;
    }

    this.processing = true;
    const event = this.eventQueue.shift()!;
    this.messageText.setText(event.message);
    this.updateHpBars();
    this.updateDpPips();

    this.time.delayedCall(1000, () => this.processNextEvent());
  }

  private showEndMessage() {
    const outcome = this.machine.outcome;
    let msg = "";
    if (outcome === "win") msg = "You won the battle!";
    else if (outcome === "lose") msg = "You lost...";
    else if (outcome === "fled") msg = "Got away safely!";

    this.messageText.setText(msg);

    this.time.delayedCall(2000, () => {
      this.scene.stop("CombatScene");
      this.scene.resume("OverworldScene");
    });
  }
}
