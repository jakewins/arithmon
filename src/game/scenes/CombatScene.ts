import { Scene } from "phaser";
import { CombatMachine, CombatEvent, MAX_DARK_POWER, PlayerAction } from "../combat/machine";
import { Monster, PARTY_LIMIT } from "../model/Monster";
import { TechniqueDef } from "../data/techniques";
import { MONSTERS } from "../data/monsters";
import { ELEMENT_SLUGS } from "../data/elements";
import { type ItemDef } from "../item/item";
import { type Inventory, getInventoryItems } from "../item/inventory";
import { canUseItem } from "../item/validation";
import { debugBridge, type DebugCommandHandler, type DebugStateProvider } from "../debug";
import { session } from "../session";
import { markSeen, markCaught } from "../model/monsterRegistry";
import { SCREEN_W, SCREEN_H } from "../screen";
import { addText, SMALL, withColor, withWrap } from "../ui/textStyle";

const WIDTH = SCREEN_W;
const HEIGHT = SCREEN_H;
// Bottom band — upstream Tuxemon sizes the prompt/menu region as
// `screen_h // 4` = 36 px (combat_state.py:357-359). The action menu inside
// the right half is a fixed 102×36 rect (combat_menus.py:118-122) anchored
// to the bottom-right corner, leaving 154×36 for the prompt on the left.
const BOX_H = 36;
const BOX_Y = HEIGHT - BOX_H;
const HP_BAR_W = 50;
const HP_BAR_H = 3;
const PLAYER_HP_BAR_W = 62;
const DP_PIP_SIZE = 4;
const DP_PIP_GAP = 1;
const BORDER_TEXTURE = "dialog-border";
const BORDER_SLICE = 3;

// Bottom-band split: action menu is a fixed 102×36 rect bottom-right,
// prompt panel takes the remaining left portion (154×36).
const RIGHT_W = 102;
const LEFT_W = WIDTH - RIGHT_W;

// --- Battle layout (derived from upstream Tuxemon combat_layouts.yaml,
// which uses the same 256×144 NATIVE_RESOLUTION). The yaml puts the player's
// monster at home=[0, 62, 96, 70] and the enemy at home=[140, 18, 96, 70]
// (origin = top-left of an island rect). Our sprites are 1:1 scale; we keep
// the island/sprite anchors at the centre-bottom of those rects.
const SPRITE_SCALE = 1.0;
const PLAYER_ISLAND_SCALE = 1.0;
const ENEMY_ISLAND_SCALE = 0.8; // smaller for perspective (back island)

// Enemy (upper-right, maps to RIGHT_COMBAT in upstream — home [140, 18, 96, 70]).
// Island feet at y = 18+70 = 88; centre-x at 140+48 = 188.
const ENEMY_ISLAND_X = 188;
const ENEMY_ISLAND_BOTTOM = 78;
const ENEMY_SPRITE_X = 188;
// Feet on island surface (~45% up from island bottom)
const ENEMY_SPRITE_Y = ENEMY_ISLAND_BOTTOM - Math.round(57 * ENEMY_ISLAND_SCALE * 0.45);
// Enemy HUD anchored at upstream's RIGHT_COMBAT.hud origin (18, 0). The
// 100×29 sprite asset sits within the 85×30 layout rect with its baked-in
// transparent margin — origin at (18,0) keeps the inner content where
// combat_layouts.yaml places it.
const ENEMY_HUD_X = 18;
const ENEMY_HUD_Y = 0;

// Player (lower-left, maps to LEFT_COMBAT — home [0, 62, 96, 70]).
// Centre-x at 48; feet just above the action bar.
const PLAYER_ISLAND_X = 48;
const PLAYER_ISLAND_BOTTOM = BOX_Y;
const PLAYER_SPRITE_X = 48;
const PLAYER_SPRITE_Y = PLAYER_ISLAND_BOTTOM - Math.round(57 * PLAYER_ISLAND_SCALE * 0.45);
const PLAYER_HUD_X = 145;
const PLAYER_HUD_Y = 45;
const PAD_X = 4;
const PAD_Y = 1;
const OPTION_H = 10;
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

// Available battle backgrounds. Day variants live at
// `assets/ui/combat/<env>_background.png` and load under the key `bg-<env>`.
// Night variants (e.g. `night_grass`) live under matching `night_<env>_*`
// filenames and load as `bg-night_<env>` so `set_environment night_grass`
// picks them up automatically. Upstream uses the same naming convention.
const BATTLE_ENVIRONMENTS = [
  "grass",
  "forest",
  "cave",
  "sand",
  "snow",
  "ocean",
  "desert",
  "beach",
  "bridge",
  "canyon",
  "cavern",
  "cliff",
  "clouds",
  "plain",
  "sea",
  "snowplain",
  "stadium",
  "sunset",
  "underwater",
  "valley",
  "arid",
  "night_arid",
  "night_beach",
  "night_bridge",
  "night_canyon",
  "night_cliff",
  "night_desert",
  "night_forest",
  "night_grass",
  "night_ocean",
  "night_plain",
  "night_sand",
  "night_sea",
  "night_snow",
  "night_snowplain",
  "night_valley",
] as const;

// Island sheets available
const ISLAND_SHEETS = ["grass", "cave", "sand", "snow", "cobble", "water", "woodland"] as const;

// Map environment to island sheet. Night variants share the day variant's
// island sheet — upstream doesn't ship night-specific island art.
const ENV_TO_ISLAND: Record<string, string> = {
  grass: "grass",
  forest: "woodland",
  cave: "cave",
  cavern: "cave",
  sand: "sand",
  beach: "sand",
  desert: "sand",
  snow: "snow",
  snowplain: "snow",
  ocean: "water",
  sea: "water",
  underwater: "water",
  stadium: "cobble",
  plain: "grass",
  valley: "grass",
  sunset: "grass",
  clouds: "grass",
  cliff: "cobble",
  canyon: "cobble",
  bridge: "cobble",
  arid: "sand",
  night_grass: "grass",
  night_forest: "woodland",
  night_sand: "sand",
  night_beach: "sand",
  night_desert: "sand",
  night_snow: "snow",
  night_snowplain: "snow",
  night_ocean: "water",
  night_sea: "water",
  night_plain: "grass",
  night_valley: "grass",
  night_cliff: "cobble",
  night_canyon: "cobble",
  night_bridge: "cobble",
  night_arid: "sand",
};

// Party icon assets
const PARTY_ICON_ASSETS: Record<string, string> = {
  "party-alive": "assets/ui/icons/party/party_icon01.png",
  "party-faint": "assets/ui/icons/party/party_icon03.png",
  "party-empty": "assets/ui/icons/party/party_empty.png",
};

// Texture keys for the attack info card icons (STORY-0203). Mirrors upstream
// combat_menus.py's `show()` closure which loads element/{slug}_type_small.png
// and range/{melee|ranged}.png from gfx/ui/icons/.
const ELEMENT_ICON_KEY = (slug: string) => `combat-element-${slug}`;
const RANGE_ICON_KEY = (range: string) => `combat-range-${range}`;
const RANGE_SLUGS = ["melee", "ranged"] as const;

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
  private background!: Phaser.GameObjects.Image;
  private playerIsland!: Phaser.GameObjects.Image;
  private enemyIsland!: Phaser.GameObjects.Image;
  private enemySprite!: Phaser.GameObjects.Image;
  private playerSprite!: Phaser.GameObjects.Image;
  private enemyHudPanel!: Phaser.GameObjects.Image;
  private playerHudPanel!: Phaser.GameObjects.Image;
  private enemyHpBar!: Phaser.GameObjects.Rectangle;
  private playerHpBar!: Phaser.GameObjects.Rectangle;
  private enemyHpBg!: Phaser.GameObjects.Rectangle;
  private playerHpBg!: Phaser.GameObjects.Rectangle;
  private enemyNameText!: Phaser.GameObjects.Text;
  private playerNameText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private dpPips: Phaser.GameObjects.Rectangle[] = [];
  private enemyPartyIcons: Phaser.GameObjects.Image[] = [];
  private playerPartyIcons: Phaser.GameObjects.Image[] = [];
  private environment = "grass";
  private eventQueue: CombatEvent[] = [];
  private processing = false;

  // Menu panels
  private leftBorder!: Phaser.GameObjects.NineSlice;
  private rightBorder!: Phaser.GameObjects.NineSlice;
  // Floating techniques popup that sits above the main menu when picking a move.
  // Mirrors upstream Tuxemon's MainCombatMenuState.open_technique_menu which
  // pushes a separate shrink-to-fit Menu state anchored above the main 2x2.
  private techPopupBorder!: Phaser.GameObjects.NineSlice;

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
  // Origin of the technique-popup interior (top-left of first label / cursor row).
  // Recomputed each time buildTechLabels runs since the popup resizes to fit.
  private techPopupOriginX = 0;
  private techPopupOriginY = 0;

  // Attack info card (bottom-left panel during technique selection).
  // Upstream renders these as transient sprites via the `show()` closure
  // hooked to on_menu_selection_change_callback in combat_menus.py.
  private infoCardName!: Phaser.GameObjects.Text;
  private infoCardAccuracy!: Phaser.GameObjects.Text;
  private infoCardPower!: Phaser.GameObjects.Text;
  private infoCardCost!: Phaser.GameObjects.Text;
  // Range pill (melee/ranged) and small element badge — STORY-0203 swapped in
  // the upstream pixel-art for what were plain text labels in STORY-0202.
  private infoCardRangeIcon!: Phaser.GameObjects.Image;
  private infoCardElementIcon!: Phaser.GameObjects.Image;

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

  // Capture animation state
  private captureBall: Phaser.GameObjects.Image | null = null;
  private captureShakeIndex = 0;

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
        frameHeight: 64,
      });
    }
    for (const slug of Object.keys(MONSTERS)) {
      if (!this.textures.exists(`${slug}-battle`)) {
        this.load.spritesheet(`${slug}-battle`, `assets/sprites/battle/${slug}-sheet.png`, {
          frameWidth: 64,
          frameHeight: 64,
        });
      }
    }
    if (!this.textures.exists(BORDER_TEXTURE)) {
      this.load.image(BORDER_TEXTURE, "assets/ui/dialog-border.png");
    }

    // Battle backgrounds
    for (const env of BATTLE_ENVIRONMENTS) {
      const key = `bg-${env}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `assets/ui/combat/${env}_background.png`);
      }
    }

    // Island platform sheets (96x57 per frame, 2 frames)
    for (const island of ISLAND_SHEETS) {
      const key = `island-${island}`;
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, `assets/ui/combat/${island}_island_sheet.png`, {
          frameWidth: 96,
          frameHeight: 57,
        });
      }
    }

    // HUD panels
    if (!this.textures.exists("hud-opponent")) {
      this.load.image("hud-opponent", "assets/ui/combat/hp_opponent_nohp.png");
    }
    if (!this.textures.exists("hud-player")) {
      this.load.image("hud-player", "assets/ui/combat/hp_player_nohp.png");
    }

    // Party tray icons
    for (const [key, path] of Object.entries(PARTY_ICON_ASSETS)) {
      if (!this.textures.exists(key)) {
        this.load.image(key, path);
      }
    }

    // Info-card icons: small element badges + melee/ranged pills.
    for (const slug of ELEMENT_SLUGS) {
      const key = ELEMENT_ICON_KEY(slug);
      if (!this.textures.exists(key)) {
        this.load.image(key, `assets/ui/icons/element/${slug}_type_small.png`);
      }
    }
    for (const range of RANGE_SLUGS) {
      const key = RANGE_ICON_KEY(range);
      if (!this.textures.exists(key)) {
        this.load.image(key, `assets/ui/icons/range/${range}.png`);
      }
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
    environment?: string;
  }) {
    this.environment = data.environment ?? "grass";
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
      session.player.darkPower,
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
    this.captureBall = null;
    this.captureShakeIndex = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor("#1a1a2e");

    // --- Battle background ---
    const bgKey = this.textures.exists(`bg-${this.environment}`)
      ? `bg-${this.environment}`
      : "bg-grass";
    this.background = this.add.image(WIDTH / 2, BOX_Y / 2, bgKey);
    this.background.setDisplaySize(WIDTH, BOX_Y);
    this.background.setDepth(0);

    // --- Island platforms ---
    const islandType = ENV_TO_ISLAND[this.environment] ?? "grass";
    const islandKey = `island-${islandType}`;

    // Enemy island (back island = frame 1) — upper right, smaller for perspective
    this.enemyIsland = this.add.image(ENEMY_ISLAND_X, ENEMY_ISLAND_BOTTOM, islandKey, 1);
    this.enemyIsland.setOrigin(0.5, 1.0);
    this.enemyIsland.setScale(ENEMY_ISLAND_SCALE);
    this.enemyIsland.setDepth(1);

    // Player island (front island = frame 0) — lower left, larger (foreground)
    this.playerIsland = this.add.image(PLAYER_ISLAND_X, PLAYER_ISLAND_BOTTOM, islandKey, 0);
    this.playerIsland.setOrigin(0.5, 1.0);
    this.playerIsland.setScale(PLAYER_ISLAND_SCALE);
    this.playerIsland.setDepth(1);

    // --- Monster sprites ---
    const enemyTexture = `${this.machine.enemy.slug}-battle`;
    const playerTexture = `${this.machine.player.slug}-battle`;

    // Enemy sprite (front view = frame 0) — on enemy island, slightly smaller for perspective
    this.enemySprite = this.add.image(ENEMY_SPRITE_X, ENEMY_SPRITE_Y, enemyTexture, 0);
    this.enemySprite.setOrigin(0.5, 1.0);
    this.enemySprite.setScale(SPRITE_SCALE * 0.85);
    this.enemySprite.setDepth(2);

    // Player sprite (back view = frame 1) — on player island
    this.playerSprite = this.add.image(PLAYER_SPRITE_X, PLAYER_SPRITE_Y, playerTexture, 1);
    this.playerSprite.setOrigin(0.5, 1.0);
    this.playerSprite.setScale(SPRITE_SCALE);
    this.playerSprite.setDepth(2);

    // --- HUD panels ---
    // Enemy HUD (upper left)
    this.enemyHudPanel = this.add.image(ENEMY_HUD_X, ENEMY_HUD_Y, "hud-opponent");
    this.enemyHudPanel.setOrigin(0, 0);
    this.enemyHudPanel.setDepth(3);

    // Player HUD (right side)
    this.playerHudPanel = this.add.image(PLAYER_HUD_X, PLAYER_HUD_Y, "hud-player");
    this.playerHudPanel.setOrigin(0, 0);
    this.playerHudPanel.setDepth(3);

    // --- Name labels on HUD panels ---
    // Upstream layout (combat_layouts.yaml): hud_line1 at (5, 5) relative to
    // the opponent HUD origin and (12, 11) relative to the player HUD origin.
    // SMALL (6 px) replaces BODY (8 px) so "Pairagrin Lv2" fits inside the
    // 85 px-wide rect with room to spare, matching upstream's render.
    this.enemyNameText = addText(this, ENEMY_HUD_X + 5, ENEMY_HUD_Y + 5, "", SMALL);
    this.enemyNameText.setDepth(4);
    this.playerNameText = addText(this, PLAYER_HUD_X + 12, PLAYER_HUD_Y + 8, "", SMALL);
    this.playerNameText.setDepth(4);

    // --- HP bars on HUD panels ---
    // Upstream hud_line2 sits at (5, 13) (opponent) / (12, 19) (player).
    const enemyHpX = ENEMY_HUD_X + 5;
    const enemyHpY = ENEMY_HUD_Y + 16;
    this.enemyHpBg = this.add.rectangle(enemyHpX, enemyHpY, HP_BAR_W, HP_BAR_H, 0x555555);
    this.enemyHpBg.setOrigin(0, 0);
    this.enemyHpBg.setDepth(4);
    this.enemyHpBar = this.add.rectangle(enemyHpX, enemyHpY, HP_BAR_W, HP_BAR_H, 0x44cc44);
    this.enemyHpBar.setOrigin(0, 0);
    this.enemyHpBar.setDepth(4);

    // Player HP bar: inside player panel, after built-in "HP" label
    const playerHpX = PLAYER_HUD_X + 12;
    const playerHpY = PLAYER_HUD_Y + 21;
    this.playerHpBg = this.add.rectangle(playerHpX, playerHpY, PLAYER_HP_BAR_W, HP_BAR_H, 0x555555);
    this.playerHpBg.setOrigin(0, 0);
    this.playerHpBg.setDepth(4);
    this.playerHpBar = this.add.rectangle(
      playerHpX,
      playerHpY,
      PLAYER_HP_BAR_W,
      HP_BAR_H,
      0x44cc44,
    );
    this.playerHpBar.setOrigin(0, 0);
    this.playerHpBar.setDepth(4);

    // --- Dark Power pips — below player HUD panel, above the party tray ---
    // Player HUD asset ends at PLAYER_HUD_Y + 37 = 82; BOX_Y = 108 with the
    // new 36 px-tall bottom band, giving 26 px of stack room beneath the
    // panel. We pack a SMALL "DP" + 5 pips on the first line and the party
    // tray on the line below. Upstream uses this band for an XP bar; we
    // documented in JOURNAL.md that we chose "between HUD and tray" so the
    // DP indicator stays visually grouped with the player's HP card without
    // overlapping the asset's baked-in "XP" label.
    const dpStartX = PLAYER_HUD_X + 8;
    const dpY = PLAYER_HUD_Y + 39;
    addText(this, dpStartX, dpY - 3, "DP", withColor(SMALL, "#bb66ff")).setDepth(4);
    this.dpPips = [];
    const pipRowOffsetX = 14; // clears the "DP" prefix
    for (let i = 0; i < MAX_DARK_POWER; i++) {
      const pip = this.add
        .rectangle(
          dpStartX + pipRowOffsetX + i * (DP_PIP_SIZE + DP_PIP_GAP) + DP_PIP_SIZE / 2,
          dpY + DP_PIP_SIZE / 2,
          DP_PIP_SIZE,
          DP_PIP_SIZE,
          0xbb66ff,
        )
        .setStrokeStyle(1, 0x8833cc)
        .setDepth(4);
      this.dpPips.push(pip);
    }

    // --- Party tray icons ---
    this.buildPartyTray();

    // --- Two-panel bottom bar ---
    // Left panel: prompt/message area (154×36, bottom-left).
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

    // Right panel: action menu (102×36, bottom-right) — fixed size and
    // anchor per upstream combat_menus.py.
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

    // Floating techniques popup — initial geometry is just a placeholder;
    // buildTechLabels resizes it to fit the current monster's move list.
    // Hidden by default; only visible while menuMode === "techniques".
    this.techPopupBorder = this.add.nineslice(
      WIDTH - RIGHT_W / 2,
      BOX_Y - (OPTION_H * 3 + PAD_Y * 2) / 2,
      BORDER_TEXTURE,
      undefined,
      RIGHT_W,
      OPTION_H * 3 + PAD_Y * 2,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
    );
    this.techPopupBorder.setDepth(100);
    this.techPopupBorder.setVisible(false);

    // Message text in left panel. SMALL keeps the "What will X do?" prompt
    // on a single line inside the 154 px wide bottom-left panel.
    this.messageText = addText(this, PAD_X, BOX_Y + PAD_Y, "", withWrap(SMALL, LEFT_W - PAD_X * 2));
    this.messageText.setDepth(101);

    // --- Attack info card (bottom-left panel during technique selection) ---
    // Layout: name on top, then a 2x2 grid of {accuracy,range},{power,cost}.
    // Created hidden; renderInfoCard toggles visibility.
    // Info-card layout: name on top, then accuracy, then range pill + power,
    // then cost. SMALL gives us ~7 px per row which packs cleanly into the
    // 36 px-tall band (4 rows × ~8 px = 32 px).
    const infoRowH = 10;
    const infoX = PAD_X;
    const infoY = BOX_Y + PAD_Y;
    this.infoCardName = addText(this, infoX, infoY, "", SMALL);
    this.infoCardName.setDepth(101);
    this.infoCardAccuracy = addText(this, infoX, infoY + infoRowH, "", SMALL);
    this.infoCardAccuracy.setDepth(101);
    // Range pill: 34x9 upstream art. Sits where the plain "RANGED" text used
    // to live (left column, third row), origin top-left to align with text.
    this.infoCardRangeIcon = this.add.image(infoX, infoY + infoRowH * 2, "");
    this.infoCardRangeIcon.setOrigin(0, 0);
    this.infoCardRangeIcon.setDepth(101);
    // Power line is to the right of the range pill (matches upstream
    // screenshot: "RANGED  Power 15").
    this.infoCardPower = addText(this, infoX + 38, infoY + infoRowH * 2, "", SMALL);
    this.infoCardPower.setDepth(101);
    this.infoCardCost = addText(this, infoX, infoY + infoRowH * 3, "", withColor(SMALL, "#7733aa"));
    this.infoCardCost.setDepth(101);
    // Element badge: 12x12 leaf/flame/etc. Right edge of the info-card panel,
    // vertically aligned with the Cost/Recharge line per upstream screenshot.
    this.infoCardElementIcon = this.add.image(LEFT_W - PAD_X - 12, infoY + infoRowH * 2, "");
    this.infoCardElementIcon.setOrigin(0, 0);
    this.infoCardElementIcon.setDepth(101);
    for (const t of [
      this.infoCardName,
      this.infoCardAccuracy,
      this.infoCardPower,
      this.infoCardCost,
    ]) {
      t.setVisible(false);
    }
    this.infoCardRangeIcon.setVisible(false);
    this.infoCardElementIcon.setVisible(false);

    // --- Main menu labels (2x2 grid in right panel) ---
    // Panel is 102 px wide; SMALL "TUXEMON" (7 chars × ~6 px) is ~42 px so
    // two columns @ ~46 px each fit with the cursor gutter and padding.
    this.mainMenuLabels = [];
    const colW = (RIGHT_W - PAD_X * 2) / MAIN_COLS;
    for (let r = 0; r < MAIN_ROWS; r++) {
      for (let c = 0; c < MAIN_COLS; c++) {
        const x = LEFT_W + PAD_X + 7 + c * colW;
        const y = BOX_Y + PAD_Y + r * (OPTION_H + 1);
        const label = addText(this, x, y, MAIN_MENU_ITEMS[r][c], SMALL);
        label.setDepth(101);
        this.mainMenuLabels.push(label);
      }
    }
    this.mainCursor = addText(this, 0, 0, CURSOR_CHAR, SMALL);
    this.mainCursor.setDepth(101);

    // --- Technique submenu labels (vertical list in right panel) ---
    // Created dynamically, but we pre-create the cursor
    this.techCursor = addText(this, 0, 0, CURSOR_CHAR, SMALL);
    this.techCursor.setDepth(101);

    // Recharge label (shown at bottom of technique list)
    this.techRechargeLabel = addText(this, 0, 0, "", withColor(SMALL, "#bb66ff"));
    this.techRechargeLabel.setDepth(101);

    // Party cursor
    this.partyCursor = addText(this, 0, 0, CURSOR_CHAR, SMALL);
    this.partyCursor.setDepth(101);

    // Item cursor
    this.itemCursor = addText(this, 0, 0, CURSOR_CHAR, SMALL);
    this.itemCursor.setDepth(101);

    // Item target cursor
    this.itemTargetCursor = addText(this, 0, 0, CURSOR_CHAR, SMALL);
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

    // Generate tuxeball texture (8x8 red/white ball)
    if (!this.textures.exists("tuxeball")) {
      const gfx = this.add.graphics();
      // White bottom half
      gfx.fillStyle(0xffffff);
      gfx.fillCircle(4, 4, 4);
      // Red top half
      gfx.fillStyle(0xcc3333);
      gfx.fillRect(0, 0, 8, 4);
      gfx.fillCircle(4, 4, 4);
      // Cut bottom half back to white
      gfx.fillStyle(0xffffff);
      gfx.fillRect(0, 4, 8, 4);
      // Black divider line
      gfx.fillStyle(0x222222);
      gfx.fillRect(0, 3, 8, 1);
      // Center button
      gfx.fillStyle(0xffffff);
      gfx.fillCircle(4, 4, 1);
      gfx.fillStyle(0x222222);
      gfx.strokeCircle(4, 4, 1);
      gfx.generateTexture("tuxeball", 8, 8);
      gfx.destroy();
    }

    this.setMenuMode("hidden");
    this.updateHpBars();
    this.updateDpPips();
    this.updateNameLabels();

    // Start combat
    this.queueEvents(this.machine.intro());

    debugBridge.setScene(this);
    debugBridge.emit("scene_started", { scene: "CombatScene" });

    this.events.once("shutdown", () => {
      // Persist post-battle Dark Power back to the player so the next combat
      // starts where this one ended (covers win, lose, fled, and any debug
      // teardown path). The machine clamps DP into [0, maxDarkPower] already.
      session.player.darkPower = this.machine.darkPower;
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

  /**
   * Submit a combat action directly to the machine for QA scripting. Bypasses
   * the menu UI and skips the event queue — events are returned synchronously.
   */
  debugSubmitCombatAction(action: PlayerAction): CombatEvent[] {
    return this.machine.submitAction(action);
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
      status: mon.status.map((s) => ({ slug: s.slug, turnsRemaining: s.turnsRemaining })),
      statStages: { ...mon.statStages },
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
    this.techPopupBorder.setVisible(false);
    this.clearPartyLabels();
    this.partyCursor.setVisible(false);
    this.clearItemLabels();
    this.itemCursor.setVisible(false);
    this.clearItemTargetLabels();
    this.itemTargetCursor.setVisible(false);

    // Info card is technique-specific; clear when leaving techniques mode.
    if (mode !== "techniques") {
      this.renderInfoCard(null);
    }

    if (mode === "main") {
      this.messageText.setText(`What will ${this.machine.player.name} do?`);
      for (const label of this.mainMenuLabels) label.setVisible(true);
      this.refreshMainMenuColors();
      this.mainCursor.setVisible(true);
      this.updateMainCursorPosition();
      debugBridge.emit("combat_menu", { mode: "main" });
    } else if (mode === "techniques") {
      // Keep the 2x2 main menu visible but dimmed underneath the popup,
      // matching upstream's layout where FIGHT row stays drawn while the
      // techniques popup floats above.
      for (const label of this.mainMenuLabels) {
        label.setVisible(true);
        label.setColor(DISABLED_COLOR);
      }
      this.buildTechLabels();
      this.techPopupBorder.setVisible(true);
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

  /**
   * Apply normal vs disabled colors to each main-menu label. Trainer battles
   * grey out RUN regardless of menu mode; this is the one place that lives.
   */
  private refreshMainMenuColors() {
    for (const label of this.mainMenuLabels) label.setColor(TEXT_COLOR);
    const runIdx = MAIN_ROWS * MAIN_COLS - 1; // bottom-right = RUN
    if (!this.machine.isWild) {
      this.mainMenuLabels[runIdx].setColor(DISABLED_COLOR);
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
    this.mainCursor.setPosition(label.x - 7, label.y);
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
    const showRecharge = this.machine.darkPower < this.machine.maxDarkPower;
    const lineCount = techniques.length + (showRecharge ? 1 : 0);

    // Size the popup to fit the longest move name plus the cursor + DP suffix.
    // Lower-bound at RIGHT_W so it visually anchors with the main-menu panel.
    let widestChars = 0;
    for (const t of techniques) {
      const len = `${t.name} ${t.dpCost}DP`.length;
      if (len > widestChars) widestChars = len;
    }
    if (showRecharge) widestChars = Math.max(widestChars, "\u26a1 RECHARGE".length);
    // ~6 px per glyph at SMALL (PressStart2P 6 px in the browser renders
    // each glyph at roughly its declared point size in monospace), plus
    // cursor gutter + padding.
    const contentW = Math.ceil(widestChars * 6) + 10 + PAD_X * 2;
    const popupW = Math.max(RIGHT_W, Math.min(contentW, WIDTH - 4));
    const popupH = lineCount * OPTION_H + PAD_Y * 2;
    const popupRight = WIDTH;
    const popupX = popupRight - popupW;
    const popupY = BOX_Y - popupH;

    this.techPopupBorder.setSize(popupW, popupH);
    this.techPopupBorder.setPosition(popupX + popupW / 2, popupY + popupH / 2);

    // Origin for technique row content (after popup's left padding + cursor gutter)
    this.techPopupOriginX = popupX + PAD_X + 8;
    this.techPopupOriginY = popupY + PAD_Y;

    for (let i = 0; i < techniques.length; i++) {
      const tech = techniques[i];
      const canAfford = this.machine.canAfford(tech);
      const label = addText(
        this,
        this.techPopupOriginX,
        this.techPopupOriginY + i * OPTION_H,
        `${tech.name} ${tech.dpCost}DP`,
        canAfford ? SMALL : withColor(SMALL, DISABLED_COLOR),
      );
      label.setDepth(101);
      label.setInteractive({ useHandCursor: true });
      label.on("pointerdown", () => {
        this.techSelected = i;
        this.updateTechCursorPosition();
        this.refreshInfoCardForTechCursor();
        this.confirmTechMenu();
      });
      this.techLabels.push(label);
    }

    // Recharge option at bottom of popup
    const rechargeY = this.techPopupOriginY + techniques.length * OPTION_H;
    this.techRechargeLabel.setPosition(this.techPopupOriginX, rechargeY);
    this.techRechargeLabel.setText("\u26a1 RECHARGE");
    this.techRechargeLabel.setVisible(showRecharge);
    if (showRecharge) {
      this.techRechargeLabel.setInteractive({ useHandCursor: true });
      this.techRechargeLabel.off("pointerdown");
      this.techRechargeLabel.on("pointerdown", () => {
        this.techSelected = techniques.length;
        this.updateTechCursorPosition();
        this.refreshInfoCardForTechCursor();
        this.confirmTechMenu();
      });
    } else {
      this.techRechargeLabel.disableInteractive();
    }

    // Populate the info card with the currently-selected technique's details.
    this.refreshInfoCardForTechCursor();
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
      this.refreshInfoCardForTechCursor();
    }
    if (this.justPressed("down")) {
      this.techSelected = (this.techSelected + 1) % optionCount;
      this.updateTechCursorPosition();
      this.refreshInfoCardForTechCursor();
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
    // Cursor sits in the popup's left gutter, aligned to the selected row.
    this.techCursor.setPosition(
      this.techPopupOriginX - 8,
      this.techPopupOriginY + this.techSelected * OPTION_H,
    );
  }

  /**
   * Sync the bottom-left info card to whatever the technique cursor is on.
   * Upstream binds the equivalent overlay to `on_menu_selection_change_callback`
   * (combat_menus.py:561) — keep them in lockstep or the card looks stale.
   */
  private refreshInfoCardForTechCursor() {
    const techniques = this.getVisibleTechniques();
    if (this.techSelected < techniques.length) {
      this.renderInfoCard(techniques[this.techSelected]);
    } else {
      // Recharge row — the info card doesn't apply to the recharge action.
      this.renderInfoCard(null);
      this.messageText.setText("Solve a math problem to recharge Dark Power.");
    }
  }

  /**
   * Populate or hide the attack info card in the bottom-left panel.
   * Passing null restores the regular messageText prompt.
   */
  private renderInfoCard(tech: TechniqueDef | null) {
    if (tech === null) {
      this.infoCardName.setVisible(false);
      this.infoCardAccuracy.setVisible(false);
      this.infoCardPower.setVisible(false);
      this.infoCardCost.setVisible(false);
      this.infoCardRangeIcon.setVisible(false);
      this.infoCardElementIcon.setVisible(false);
      this.messageText.setVisible(true);
      return;
    }

    this.messageText.setVisible(false);
    this.infoCardName.setText(tech.name);
    this.infoCardName.setVisible(true);

    this.infoCardAccuracy.setText(`Accuracy ${Math.round(tech.accuracy * 100)}%`);
    this.infoCardAccuracy.setVisible(true);

    // Power line is derived from the first damage effect; non-damage moves
    // (Growl, Harden, etc.) hide the line entirely rather than showing "Power 0".
    const damageEffect = tech.effects.find((e) => e.kind === "damage");
    if (damageEffect && damageEffect.kind === "damage") {
      this.infoCardPower.setText(`Power ${damageEffect.power}`);
      this.infoCardPower.setVisible(true);
    } else {
      this.infoCardPower.setVisible(false);
    }

    this.infoCardCost.setText(`Cost ${tech.dpCost} DP`);
    this.infoCardCost.setVisible(true);

    // Range pill and element badge: upstream pixel-art, same path scheme as
    // combat_menus.py's show() closure (gfx/ui/icons/{range,element}/...).
    this.infoCardRangeIcon.setTexture(RANGE_ICON_KEY(tech.range));
    this.infoCardRangeIcon.setVisible(true);
    this.infoCardElementIcon.setTexture(ELEMENT_ICON_KEY(tech.element));
    this.infoCardElementIcon.setVisible(true);
  }

  private confirmTechMenu() {
    const techniques = this.getVisibleTechniques();

    if (this.techSelected < techniques.length) {
      const tech = techniques[this.techSelected];
      if (!this.machine.canAfford(tech)) {
        // Surface the error in the bottom-left panel; hide the info card so
        // the message isn't covered by the technique-details overlay.
        this.renderInfoCard(null);
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
    const baseX = LEFT_W + PAD_X + 8;
    const baseY = BOX_Y + PAD_Y;
    const PARTY_ROW_H = 8;

    for (let i = 0; i < party.length; i++) {
      const mon = party[i];
      const isActive = mon === this.machine.player;
      const isFainted = mon.fainted;
      let text = `${mon.name} ${mon.currentHp}/${mon.maxHp}`;
      if (isActive) text += " \u2605";
      if (isFainted) text += " KO";

      const color = isFainted || isActive ? DISABLED_COLOR : TEXT_COLOR;
      const label = addText(this, baseX, baseY + i * PARTY_ROW_H, text, withColor(SMALL, color));
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
    const PARTY_ROW_H = 8;
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
    const baseX = LEFT_W + PAD_X + 8;
    const baseY = BOX_Y + PAD_Y;

    for (let i = 0; i < this.combatItems.length; i++) {
      const entry = this.combatItems[i];
      const label = addText(
        this,
        baseX,
        baseY + i * OPTION_H,
        `${entry.item.name} x${entry.count}`,
        SMALL,
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
    const baseX = LEFT_W + PAD_X + 8;
    const baseY = BOX_Y + PAD_Y;
    const PARTY_ROW_H = 8;

    for (let i = 0; i < party.length; i++) {
      const mon = party[i];
      const valid = this.pendingItem ? canUseItem(this.pendingItem, mon, "combat") : false;
      let text = `${mon.name} ${mon.currentHp}/${mon.maxHp}`;
      if (mon.fainted) text += " KO";

      const color = valid ? TEXT_COLOR : DISABLED_COLOR;
      const label = addText(this, baseX, baseY + i * PARTY_ROW_H, text, withColor(SMALL, color));
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
    const PARTY_ROW_H = 8;
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

  private updateDpPips() {
    for (let i = 0; i < this.dpPips.length; i++) {
      if (i < this.machine.darkPower) {
        this.dpPips[i].setFillStyle(0xbb66ff);
      } else {
        this.dpPips[i].setFillStyle(0x332244);
      }
    }
  }

  private buildPartyTray() {
    // Clean up existing icons
    for (const icon of this.enemyPartyIcons) icon.destroy();
    for (const icon of this.playerPartyIcons) icon.destroy();
    this.enemyPartyIcons = [];
    this.playerPartyIcons = [];

    const ICON_SIZE = 7;
    const ICON_GAP = 2;
    const MAX_PARTY = 6;

    // Enemy party tray — below enemy HUD
    const enemyTrayX = ENEMY_HUD_X + 5;
    const enemyTrayY = ENEMY_HUD_Y + 32;
    const enemyParty = this.machine.enemyParty;
    for (let i = 0; i < MAX_PARTY; i++) {
      let iconKey: string;
      if (i < enemyParty.length) {
        iconKey = enemyParty[i].fainted ? "party-faint" : "party-alive";
      } else {
        iconKey = "party-empty";
      }
      const icon = this.add.image(enemyTrayX + i * (ICON_SIZE + ICON_GAP), enemyTrayY, iconKey);
      icon.setOrigin(0, 0);
      icon.setDepth(4);
      this.enemyPartyIcons.push(icon);
    }

    // Player party tray — below DP pips
    const playerTrayX = PLAYER_HUD_X + 8;
    const playerTrayY = PLAYER_HUD_Y + 47;
    const playerParty = this.machine.party;
    for (let i = 0; i < MAX_PARTY; i++) {
      let iconKey: string;
      if (i < playerParty.length) {
        iconKey = playerParty[i].fainted ? "party-faint" : "party-alive";
      } else {
        iconKey = "party-empty";
      }
      const icon = this.add.image(playerTrayX + i * (ICON_SIZE + ICON_GAP), playerTrayY, iconKey);
      icon.setOrigin(0, 0);
      icon.setDepth(4);
      this.playerPartyIcons.push(icon);
    }
  }

  private updatePartyTray() {
    const MAX_PARTY = 6;
    const playerParty = this.machine.party;
    for (let i = 0; i < MAX_PARTY; i++) {
      const icon = this.playerPartyIcons[i];
      if (!icon) continue;
      if (i < playerParty.length) {
        icon.setTexture(playerParty[i].fainted ? "party-faint" : "party-alive");
      } else {
        icon.setTexture("party-empty");
      }
    }
    const enemyParty = this.machine.enemyParty;
    for (let i = 0; i < MAX_PARTY; i++) {
      const icon = this.enemyPartyIcons[i];
      if (!icon) continue;
      if (i < enemyParty.length) {
        icon.setTexture(enemyParty[i].fainted ? "party-faint" : "party-alive");
      } else {
        icon.setTexture("party-empty");
      }
    }
  }

  private updatePlayerSprite() {
    const texture = `${this.machine.player.slug}-battle`;
    this.playerSprite.setTexture(texture, 1); // back view = frame 1
  }

  private updateEnemySprite() {
    const texture = `${this.machine.enemy.slug}-battle`;
    this.enemySprite.setTexture(texture, 0); // front view = frame 0
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

    // Update party tray on faint events
    if (event.type === "faint" || event.type === "swap_in") {
      this.updatePartyTray();
    }

    // --- Capture animations ---
    if (event.type === "item_used" && this.eventQueue[0]?.type === "capture_shake") {
      this.playCaptureThrowAnimation(() => this.processNextEvent());
      return;
    }
    if (event.type === "capture_shake") {
      this.playCaptureShakeAnimation(() => this.processNextEvent());
      return;
    }
    if (event.type === "capture_success") {
      this.playCaptureSuccessAnimation(() => this.processNextEvent());
      return;
    }
    if (event.type === "capture_fail") {
      this.playCaptureFailAnimation(() => this.processNextEvent());
      return;
    }

    this.time.delayedCall(1000, () => this.processNextEvent());
  }

  // --- Capture animation methods ---

  private playCaptureThrowAnimation(onComplete: () => void) {
    this.captureShakeIndex = 0;

    // Create ball at player position
    const ball = this.add.image(PLAYER_SPRITE_X, PLAYER_SPRITE_Y - 20, "tuxeball");
    ball.setScale(1.5);
    ball.setDepth(10);
    this.captureBall = ball;

    // Arc throw from player to enemy
    const targetX = ENEMY_SPRITE_X;
    const targetY = ENEMY_SPRITE_Y - 10;
    const midY = Math.min(ball.y, targetY) - 50; // arc peak

    this.tweens.add({
      targets: ball,
      x: targetX,
      y: targetY,
      duration: 600,
      ease: "Sine.easeIn",
      onUpdate: (_tween, _target, _key, _value, progress: number) => {
        // Parabolic arc: offset Y upward at midpoint
        const arcOffset = -Math.sin(progress * Math.PI) * (ball.y - midY);
        ball.y += arcOffset * 0.15;
        ball.angle = progress * 360; // spin the ball
      },
      onComplete: () => {
        ball.angle = 0;
        // Flash the enemy sprite, then shrink it into the ball
        this.tweens.add({
          targets: this.enemySprite,
          alpha: 0,
          scaleX: 0,
          scaleY: 0,
          duration: 400,
          ease: "Power2",
          onComplete: () => {
            // Ball drops to ground (island surface)
            this.tweens.add({
              targets: ball,
              y: ENEMY_ISLAND_BOTTOM - 6,
              duration: 300,
              ease: "Bounce.easeOut",
              onComplete: () => {
                onComplete();
              },
            });
          },
        });
      },
    });
  }

  private playCaptureShakeAnimation(onComplete: () => void) {
    this.captureShakeIndex++;
    if (!this.captureBall) {
      onComplete();
      return;
    }

    const ball = this.captureBall;
    // Wobble left-right
    this.tweens.add({
      targets: ball,
      angle: -20,
      duration: 100,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.tweens.add({
          targets: ball,
          angle: 20,
          duration: 100,
          yoyo: true,
          repeat: 1,
          ease: "Sine.easeInOut",
          onComplete: () => {
            ball.angle = 0;
            this.time.delayedCall(300, onComplete);
          },
        });
      },
    });
  }

  private playCaptureSuccessAnimation(onComplete: () => void) {
    if (!this.captureBall) {
      onComplete();
      return;
    }

    const ball = this.captureBall;
    // Small "click" — scale down briefly then back, with a star flash
    this.tweens.add({
      targets: ball,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 150,
      yoyo: true,
      ease: "Power2",
      onComplete: () => {
        // Flash particles around the ball
        const flash = this.add.circle(ball.x, ball.y, 12, 0xffff88, 0.8);
        flash.setDepth(9);
        this.tweens.add({
          targets: flash,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 400,
          onComplete: () => {
            flash.destroy();
            this.time.delayedCall(500, onComplete);
          },
        });
      },
    });
  }

  private playCaptureFailAnimation(onComplete: () => void) {
    if (this.captureBall) {
      // Ball breaks open — flash and disappear
      this.tweens.add({
        targets: this.captureBall,
        alpha: 0,
        scaleX: 3,
        scaleY: 3,
        duration: 300,
        onComplete: () => {
          this.captureBall?.destroy();
          this.captureBall = null;
        },
      });
    }

    // Monster reappears
    const origScale = SPRITE_SCALE * 0.85;
    this.enemySprite.setScale(0);
    this.enemySprite.setAlpha(1);
    this.tweens.add({
      targets: this.enemySprite,
      scaleX: origScale,
      scaleY: origScale,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(500, onComplete);
      },
    });
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
