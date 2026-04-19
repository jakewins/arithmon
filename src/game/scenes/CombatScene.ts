import { Scene } from "phaser";
import { CombatMachine, CombatEvent, MAX_DARK_POWER } from "../combat/machine";
import { Monster, PARTY_LIMIT } from "../model/Monster";
import { TechniqueDef } from "../data/techniques";
import { type ItemDef } from "../item/item";
import { type Inventory, getInventoryItems } from "../item/inventory";
import { canUseItem } from "../item/validation";
import { debugBridge, type DebugCommandHandler, type DebugStateProvider } from "../debug";
import { session } from "../session";
import { markSeen, markCaught } from "../model/monsterRegistry";

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

type MenuMode = "hidden" | "main" | "techniques" | "party" | "items" | "item_target";

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
  private xpBar!: Phaser.GameObjects.Rectangle;
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

  // Party submenu
  private partyLabels: Phaser.GameObjects.Text[] = [];
  private partyCursor!: Phaser.GameObjects.Text;
  private partySelected = 0;
  private forceSwap = false;

  // Item submenu
  private itemLabels: Phaser.GameObjects.Text[] = [];
  private itemCursor!: Phaser.GameObjects.Text;
  private itemSelected = 0;
  private combatItems: Array<{ item: ItemDef; count: number }> = [];

  // Item target selection (reuses party labels)
  private pendingItem: ItemDef | null = null;
  private itemTargetLabels: Phaser.GameObjects.Text[] = [];
  private itemTargetCursor!: Phaser.GameObjects.Text;
  private itemTargetSelected = 0;

  private inventory!: Inventory;
  private goldReward = 0;
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
    for (const slug of [
      "dollfin",
      "ignibus",
      "memnomnom",
      "budaye",
      "grintot",
      "pairagrin",
      "aardorn",
      "cataspike",
      "cardiling",
      "eyenemy",
    ]) {
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

  init(data: {
    playerMonster: Monster;
    enemyMonster: Monster;
    party?: Monster[];
    inventory?: Inventory;
    isWild?: boolean;
    enemyParty?: Monster[];
    trainerName?: string;
    goldReward?: number;
  }) {
    this.goldReward = data.goldReward ?? 0;
    this.inventory = data.inventory ?? new Map();
    this.machine = new CombatMachine(
      data.playerMonster,
      data.enemyMonster,
      data.party,
      this.inventory,
      data.isWild ?? true,
      data.enemyParty,
      data.trainerName,
    );
    // Mark enemy species as seen in the journal
    markSeen(session.monsterRegistry, data.enemyMonster.slug);

    this.machine.onCapture = (monster: Monster) => {
      markCaught(session.monsterRegistry, monster.slug);
      if (session.player.monsters.length < PARTY_LIMIT) {
        session.player.monsters.push(monster);
      } else {
        session.monsterStorage.push(monster);
      }
    };
    this.eventQueue = [];
    this.processing = false;
    this.menuMode = "hidden";
    this.mainRow = 0;
    this.mainCol = 0;
    this.techSelected = 0;
    this.partySelected = 0;
    this.forceSwap = false;
    this.itemSelected = 0;
    this.itemTargetSelected = 0;
    this.pendingItem = null;
    this.combatItems = [];
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

    // XP bar — below DP pips, player only
    const xpBarY = dpY + 8;
    const XP_BAR_H = 4;
    this.add.text(dpStartX, xpBarY - 2, "XP", { fontSize: "8px", color: "#4488ff" });
    this.add.rectangle(dpStartX + HP_BAR_W / 2 + 16, xpBarY + 1, HP_BAR_W - 16, XP_BAR_H, 0x222244);
    this.xpBar = this.add.rectangle(
      dpStartX + HP_BAR_W / 2 + 16,
      xpBarY + 1,
      HP_BAR_W - 16,
      XP_BAR_H,
      0x4488ff,
    );

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

    // Party cursor
    this.partyCursor = this.add.text(0, 0, CURSOR_CHAR, {
      fontSize: "11px",
      color: TEXT_COLOR,
    });
    this.partyCursor.setDepth(101);

    // Item cursor
    this.itemCursor = this.add.text(0, 0, CURSOR_CHAR, {
      fontSize: "11px",
      color: TEXT_COLOR,
    });
    this.itemCursor.setDepth(101);

    // Item target cursor
    this.itemTargetCursor = this.add.text(0, 0, CURSOR_CHAR, {
      fontSize: "11px",
      color: TEXT_COLOR,
    });
    this.itemTargetCursor.setDepth(101);

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
    this.updateXpBar();
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
    } else if (this.menuMode === "party") {
      this.updatePartyMenu();
    } else if (this.menuMode === "items") {
      this.updateItemMenu();
    } else if (this.menuMode === "item_target") {
      this.updateItemTargetMenu();
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
    } else if (this.menuMode === "party") {
      if (index >= 0 && index < this.machine.party.length) {
        this.partySelected = index;
        this.confirmPartyMenu();
      }
    } else if (this.menuMode === "items") {
      if (index >= 0 && index < this.combatItems.length) {
        this.itemSelected = index;
        this.confirmItemMenu();
      }
    } else if (this.menuMode === "item_target") {
      if (index >= 0 && index < this.machine.party.length) {
        this.itemTargetSelected = index;
        this.confirmItemTargetMenu();
      }
    }
  }

  debugSetEnemyHp(hp: number): void {
    this.machine.enemy.currentHp = Math.max(0, Math.min(hp, this.machine.enemy.maxHp));
    this.updateHpBars();
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
      totalXp: mon.totalXp,
      xpProgress: mon.xpProgress,
      techniqueCount: mon.techniques.length,
    });
    return {
      combat: {
        state: m.state,
        outcome: m.outcome,
        darkPower: m.darkPower,
        maxDarkPower: m.maxDarkPower,
        isWild: m.isWild,
        trainerName: m.trainerName,
        menuMode: this.menuMode,
        forceSwap: this.forceSwap,
        playerMonster: monsterSnapshot(m.player),
        enemyMonster: monsterSnapshot(m.enemy),
        party: m.party.map((mon) => ({
          ...monsterSnapshot(mon),
          active: mon === m.player,
        })),
        enemyParty: m.enemyParty.map((mon) => ({
          ...monsterSnapshot(mon),
          active: mon === m.enemy,
        })),
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
    this.clearPartyLabels();
    this.partyCursor.setVisible(false);
    this.clearItemLabels();
    this.itemCursor.setVisible(false);
    this.clearItemTargetLabels();
    this.itemTargetCursor.setVisible(false);

    if (mode === "main") {
      this.messageText.setText(`What will ${this.machine.player.name} do?`);
      for (const label of this.mainMenuLabels) label.setVisible(true);
      // Grey out RUN label in trainer battles
      const runIdx = MAIN_ROWS * MAIN_COLS - 1; // bottom-right = RUN
      if (!this.machine.isWild) {
        this.mainMenuLabels[runIdx].setColor(DISABLED_COLOR);
      } else {
        this.mainMenuLabels[runIdx].setColor(TEXT_COLOR);
      }
      this.mainCursor.setVisible(true);
      this.updateMainCursorPosition();
      debugBridge.emit("combat_menu", { mode: "main" });
    } else if (mode === "techniques") {
      this.buildTechLabels();
      this.techCursor.setVisible(true);
      this.updateTechCursorPosition();
      debugBridge.emit("combat_menu", { mode: "techniques" });
    } else if (mode === "party") {
      this.buildPartyLabels();
      this.partyCursor.setVisible(true);
      this.updatePartyCursorPosition();
      debugBridge.emit("combat_menu", { mode: "party", forceSwap: this.forceSwap });
    } else if (mode === "items") {
      this.buildItemLabels();
      this.itemCursor.setVisible(true);
      this.updateItemCursorPosition();
      debugBridge.emit("combat_menu", { mode: "items" });
    } else if (mode === "item_target") {
      this.buildItemTargetLabels();
      this.itemTargetCursor.setVisible(true);
      this.updateItemTargetCursorPosition();
      debugBridge.emit("combat_menu", { mode: "item_target", item: this.pendingItem?.slug });
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
        if (!this.machine.hasSwapTargets()) {
          this.messageText.setText("No other monsters!");
          return;
        }
        this.partySelected = 0;
        this.forceSwap = false;
        this.setMenuMode("party");
        break;
      case "ITEM": {
        this.combatItems = getInventoryItems(this.inventory).filter((e) =>
          e.item.usableIn.includes("combat"),
        );
        if (this.combatItems.length === 0) {
          this.messageText.setText("No items!");
          return;
        }
        this.itemSelected = 0;
        this.setMenuMode("items");
        break;
      }
      case "RUN":
        if (!this.machine.isWild) {
          this.messageText.setText("Can't escape from a trainer battle!");
          return;
        }
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

  // --- Party submenu ---

  private buildPartyLabels() {
    this.clearPartyLabels();
    const party = this.machine.party;
    const baseX = LEFT_W + PAD_X + 12;
    const baseY = BOX_Y + PAD_Y;
    const PARTY_ROW_H = 10;

    for (let i = 0; i < party.length; i++) {
      const mon = party[i];
      const isActive = mon === this.machine.player;
      const isFainted = mon.fainted;
      let text = `${mon.name} ${mon.currentHp}/${mon.maxHp}`;
      if (isActive) text += " \u2605";
      if (isFainted) text += " KO";

      const color = isFainted || isActive ? DISABLED_COLOR : TEXT_COLOR;
      const label = this.add.text(baseX, baseY + i * PARTY_ROW_H, text, {
        fontSize: "9px",
        color,
      });
      label.setDepth(101);
      this.partyLabels.push(label);
    }

    this.messageText.setText(this.forceSwap ? "Choose a replacement!" : "Choose a monster:");
  }

  private clearPartyLabels() {
    for (const label of this.partyLabels) label.destroy();
    this.partyLabels = [];
  }

  private updatePartyMenu() {
    const count = this.machine.party.length;

    if (this.justPressed("up")) {
      this.partySelected = (this.partySelected - 1 + count) % count;
      this.updatePartyCursorPosition();
    }
    if (this.justPressed("down")) {
      this.partySelected = (this.partySelected + 1) % count;
      this.updatePartyCursorPosition();
    }

    if (!this.forceSwap && this.isBackPressed()) {
      this.partySelected = 0;
      this.setMenuMode("main");
      return;
    }

    if (this.isConfirmPressed()) {
      this.confirmPartyMenu();
    }
  }

  private updatePartyCursorPosition() {
    const baseX = LEFT_W + PAD_X;
    const baseY = BOX_Y + PAD_Y;
    const PARTY_ROW_H = 10;
    this.partyCursor.setPosition(baseX, baseY + this.partySelected * PARTY_ROW_H);
  }

  private confirmPartyMenu() {
    const idx = this.partySelected;
    if (!this.machine.canSwapTo(idx)) {
      const mon = this.machine.party[idx];
      if (mon === this.machine.player) {
        this.messageText.setText(`${mon.name} is already in battle!`);
      } else if (mon?.fainted) {
        this.messageText.setText(`${mon.name} has fainted!`);
      }
      return;
    }

    this.setMenuMode("hidden");
    if (this.forceSwap) {
      const events = this.machine.submitForceSwap(idx);
      this.forceSwap = false;
      this.queueEvents(events);
    } else {
      this.queueEvents(this.machine.submitAction({ type: "swap", partyIndex: idx }));
    }
  }

  // --- Item submenu ---

  private buildItemLabels() {
    this.clearItemLabels();
    const baseX = LEFT_W + PAD_X + 12;
    const baseY = BOX_Y + PAD_Y;

    for (let i = 0; i < this.combatItems.length; i++) {
      const entry = this.combatItems[i];
      const label = this.add.text(
        baseX,
        baseY + i * OPTION_H,
        `${entry.item.name} x${entry.count}`,
        { fontSize: "11px", color: TEXT_COLOR },
      );
      label.setDepth(101);
      this.itemLabels.push(label);
    }

    this.messageText.setText("Choose an item:");
  }

  private clearItemLabels() {
    for (const label of this.itemLabels) label.destroy();
    this.itemLabels = [];
  }

  private updateItemMenu() {
    const count = this.combatItems.length;

    if (this.justPressed("up")) {
      this.itemSelected = (this.itemSelected - 1 + count) % count;
      this.updateItemCursorPosition();
    }
    if (this.justPressed("down")) {
      this.itemSelected = (this.itemSelected + 1) % count;
      this.updateItemCursorPosition();
    }

    if (this.isBackPressed()) {
      this.itemSelected = 0;
      this.setMenuMode("main");
      return;
    }

    if (this.isConfirmPressed()) {
      this.confirmItemMenu();
    }
  }

  private updateItemCursorPosition() {
    const baseX = LEFT_W + PAD_X;
    const baseY = BOX_Y + PAD_Y;
    this.itemCursor.setPosition(baseX, baseY + this.itemSelected * OPTION_H);
  }

  private confirmItemMenu() {
    const entry = this.combatItems[this.itemSelected];
    if (!entry) return;

    if (entry.item.category === "capture") {
      if (!this.machine.isWild) {
        this.messageText.setText("Can't capture trainer monsters!");
        return;
      }
      this.setMenuMode("hidden");
      this.queueEvents(this.machine.submitAction({ type: "capture", itemSlug: entry.item.slug }));
      return;
    }

    // Check if any party member is a valid target
    const hasTarget = this.machine.party.some((m) => canUseItem(entry.item, m, "combat"));
    if (!hasTarget) {
      this.messageText.setText("No valid targets!");
      return;
    }

    this.pendingItem = entry.item;
    this.itemTargetSelected = 0;
    this.setMenuMode("item_target");
  }

  // --- Item target selection ---

  private buildItemTargetLabels() {
    this.clearItemTargetLabels();
    const party = this.machine.party;
    const baseX = LEFT_W + PAD_X + 12;
    const baseY = BOX_Y + PAD_Y;
    const PARTY_ROW_H = 10;

    for (let i = 0; i < party.length; i++) {
      const mon = party[i];
      const valid = this.pendingItem ? canUseItem(this.pendingItem, mon, "combat") : false;
      let text = `${mon.name} ${mon.currentHp}/${mon.maxHp}`;
      if (mon.fainted) text += " KO";

      const color = valid ? TEXT_COLOR : DISABLED_COLOR;
      const label = this.add.text(baseX, baseY + i * PARTY_ROW_H, text, {
        fontSize: "9px",
        color,
      });
      label.setDepth(101);
      this.itemTargetLabels.push(label);
    }

    this.messageText.setText(`Use ${this.pendingItem?.name} on whom?`);
  }

  private clearItemTargetLabels() {
    for (const label of this.itemTargetLabels) label.destroy();
    this.itemTargetLabels = [];
  }

  private updateItemTargetMenu() {
    const count = this.machine.party.length;

    if (this.justPressed("up")) {
      this.itemTargetSelected = (this.itemTargetSelected - 1 + count) % count;
      this.updateItemTargetCursorPosition();
    }
    if (this.justPressed("down")) {
      this.itemTargetSelected = (this.itemTargetSelected + 1) % count;
      this.updateItemTargetCursorPosition();
    }

    if (this.isBackPressed()) {
      this.pendingItem = null;
      this.itemTargetSelected = 0;
      this.setMenuMode("items");
      return;
    }

    if (this.isConfirmPressed()) {
      this.confirmItemTargetMenu();
    }
  }

  private updateItemTargetCursorPosition() {
    const baseX = LEFT_W + PAD_X;
    const baseY = BOX_Y + PAD_Y;
    const PARTY_ROW_H = 10;
    this.itemTargetCursor.setPosition(baseX, baseY + this.itemTargetSelected * PARTY_ROW_H);
  }

  private confirmItemTargetMenu() {
    const item = this.pendingItem;
    if (!item) return;

    const target = this.machine.party[this.itemTargetSelected];
    if (!target || !canUseItem(item, target, "combat")) {
      if (target?.fainted && !item.effects.some((e) => e.type === "revive")) {
        this.messageText.setText(`${target.name} has fainted!`);
      } else if (target && !target.fainted && target.currentHp >= target.maxHp) {
        this.messageText.setText(`${target.name} is already at full HP!`);
      } else {
        this.messageText.setText("Can't use that here!");
      }
      return;
    }

    this.pendingItem = null;
    this.setMenuMode("hidden");
    this.queueEvents(
      this.machine.submitAction({
        type: "item",
        itemSlug: item.slug,
        targetIndex: this.itemTargetSelected,
      }),
    );
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

  private updateXpBar() {
    const progress = this.machine.player.xpProgress;
    this.xpBar.setScale(Math.max(0.01, progress), 1);
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

  private updatePlayerSprite() {
    const texture = `${this.machine.player.slug}-battle`;
    this.playerSprite.setTexture(texture, 0);
  }

  private updateEnemySprite() {
    const texture = `${this.machine.enemy.slug}-battle`;
    this.enemySprite.setTexture(texture, 1);
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
      } else if (this.machine.state === "FORCE_SWAP") {
        this.forceSwap = true;
        this.partySelected = 0;
        this.setMenuMode("party");
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
    this.updateXpBar();

    // Update sprite and name when a new monster is swapped in
    if (event.type === "swap_in") {
      this.updatePlayerSprite();
      this.updateEnemySprite();
      this.updateNameLabels();
    }

    // Update name label when leveling up (shows new level)
    if (event.type === "level_up") {
      this.updateNameLabels();
    }

    this.time.delayedCall(1000, () => this.processNextEvent());
  }

  private showEndMessage() {
    const outcome = this.machine.outcome;
    let msg = "";
    if (outcome === "win") {
      if (this.machine.trainerName && this.goldReward > 0) {
        session.player.money += this.goldReward;
        msg = `You defeated ${this.machine.trainerName}! Got ${this.goldReward}G!`;
      } else if (this.machine.trainerName) {
        msg = `You defeated ${this.machine.trainerName}!`;
      } else {
        msg = "You won the battle!";
      }
    } else if (outcome === "lose") msg = "You lost...";
    else if (outcome === "fled") msg = "Got away safely!";

    this.messageText.setText(msg);

    // Store outcome in scene data so start_battle action can read it
    if (outcome) {
      this.data.set("outcome", outcome);
    }

    this.time.delayedCall(2000, () => {
      this.scene.stop("CombatScene");
      this.scene.resume("OverworldScene");
    });
  }
}
