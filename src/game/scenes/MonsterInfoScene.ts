/**
 * MonsterInfoScene — single-monster "journal info" / Pokédex-style detail
 * page. Mirrors upstream `JournalInfoState` (tuxemon/states/journal_info.py).
 *
 * Launched by the `open_journal <slug>` event action, e.g. from the
 * paper-town bin events. Closes on B / ESC / BACKSPACE / SPACE.
 *
 * The cream background + striped sprite frame + blue border all come from the
 * upstream `tux_info.png` (256×144). At our native viewport it now fills the
 * canvas exactly — no centering offset needed. Text/icon positions are ported
 * from upstream's `add_menu_items` fractional coordinates, then nudged to
 * match the reference screenshot.
 */

import { Scene } from "phaser";
import { debugBridge, type DebugStateProvider } from "../debug";
import { MONSTERS } from "../data/monsters";
import { t } from "../i18n";
import { formatText } from "../textFormatter";
import { SCREEN_W, SCREEN_H } from "../screen";
import { addText, BODY, NAME, SMALL, SMALL_HEADING, withWrap } from "../ui/textStyle";

// Upstream `tux_info.png` is 256×144 — same as our native viewport, so it
// blits 1:1 from the top-left. BG_W is reused for the bottom panel width;
// BG_X/BG_Y are kept (=0) so the upstream-derived offset math below stays
// self-explanatory.
const BG_W = SCREEN_W;
const BG_X = 0;
const BG_Y = 0;

// Sprite is drawn inside the striped frame; the frame sits in the top-left
// quadrant of the cream area. Centre of the 64×64 sprite ≈ centre of frame.
const SPRITE_CENTER_X = BG_X + 84;
const SPRITE_CENTER_Y = BG_Y + 48;

// Right-hand info column (everything to the right of the sprite frame).
const RIGHT_COL_X = BG_X + 126;

// Bottom panel (description + evolution).
const BOTTOM_PANEL_X = BG_X + 6;
const BOTTOM_PANEL_W = BG_W - 12;
const DESC_Y = BG_Y + 84;
const EVO_LABEL_Y = BG_Y + 109;
const EVO_LIST_Y = BG_Y + 118;

// Element-type icons are 12×12; loaded once per type slug as `elem-<slug>`.
const ELEMENT_ICONS = [
  "cosmic",
  "earth",
  "fire",
  "frost",
  "heroic",
  "lightning",
  "metal",
  "normal",
  "shadow",
  "sky",
  "venom",
  "water",
  "wood",
] as const;

const KEY_ESC = 27;
const KEY_X = 88;
const KEY_BACKSPACE = 8;
const KEY_B = 66;
const KEY_SPACE = 32;

export interface MonsterInfoSceneData {
  slug: string;
}

export class MonsterInfoScene extends Scene implements DebugStateProvider {
  private slug = "";
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prevKeys: Record<string, boolean> = {};
  private previousScene: Phaser.Scene | null = null;

  constructor() {
    super("MonsterInfoScene");
  }

  preload() {
    if (!this.textures.exists("tux_info")) {
      this.load.image("tux_info", "assets/ui/background/tux_info.png");
    }
    for (const slug of ELEMENT_ICONS) {
      const key = `elem-${slug}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `assets/ui/icons/element/${slug}_type_small.png`);
      }
    }
  }

  init(data: MonsterInfoSceneData) {
    this.slug = data?.slug ?? "";
  }

  create() {
    this.prevKeys = {};

    // Dim the parent scene so the journal feels modal. Matches the dark
    // bezel around upstream's panel where the BG doesn't reach the edges.
    this.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x000000, 0.85).setOrigin(0, 0).setDepth(0);

    // Background — cream panel + blue border + striped sprite frame.
    this.add.image(SCREEN_W / 2, SCREEN_H / 2, "tux_info").setDepth(1);

    const def = MONSTERS[this.slug];
    if (def) {
      this.renderMonster();
    } else {
      // Unknown slug — render a placeholder rather than crashing.
      this.add
        .text(SCREEN_W / 2, SCREEN_H / 2, `Unknown monster: ${this.slug}`, BODY)
        .setOrigin(0.5)
        .setDepth(5);
    }

    this.keys = {
      back: this.input.keyboard!.addKey(KEY_ESC),
      backX: this.input.keyboard!.addKey(KEY_X),
      backB: this.input.keyboard!.addKey(KEY_B),
      backspace: this.input.keyboard!.addKey(KEY_BACKSPACE),
      backSpace: this.input.keyboard!.addKey(KEY_SPACE),
    };

    // Stash the previous DebugBridge scene so we can restore it on shutdown —
    // we're launched on top (not via pause/resume), so the parent scene won't
    // automatically re-register itself via its `resume` listener.
    this.previousScene = debugBridge.getActiveScene();
    debugBridge.setScene(this);
    debugBridge.emit("scene_started", { scene: "MonsterInfoScene", slug: this.slug });

    this.events.once("shutdown", () => {
      if (this.previousScene) debugBridge.setScene(this.previousScene);
      debugBridge.emit("scene_stopped", { scene: "MonsterInfoScene" });
    });
  }

  update() {
    if (this.isBackPressed()) {
      this.closeScreen();
      return;
    }
    for (const [name, key] of Object.entries(this.keys)) {
      this.prevKeys[name] = key.isDown;
    }
  }

  getDebugState(): Record<string, unknown> {
    return { monsterInfo: { slug: this.slug } };
  }

  // --- Rendering ---

  private renderMonster() {
    const def = MONSTERS[this.slug];

    // Monster sprite — frame 0 of the battle sheet is the front-facing pose.
    const spriteTex = `${this.slug}-battle`;
    if (this.textures.exists(spriteTex)) {
      this.add.image(SPRITE_CENTER_X, SPRITE_CENTER_Y, spriteTex, 0).setDepth(5);
    }

    // Right-column rows. The top cream panel runs ~y=8..76 of the BG; we
    // cram these 6 rows in (ID, NAME, species, size, types, body type).
    // Per upstream `journal_info.py`, every label other than the monster name
    // is `FONT_SIZE_SMALL = 4` (design px); we map that to our SMALL (6 px in
    // the browser — see textStyle.ts on why we deviate from 4 px upstream).
    // ID
    const idText = def.txmnId !== undefined ? `ID: ${def.txmnId}` : "ID: —";
    addText(this, RIGHT_COL_X, BG_Y + 6, idText, SMALL).setDepth(5);

    // Name (uppercase, 8 px bold = upstream FONT_SIZE_BIGGEST).
    addText(this, RIGHT_COL_X, BG_Y + 14, def.name.toUpperCase(), NAME).setDepth(5);

    // Species ("<Species> Species"). Category strings can carry placeholders.
    const speciesText = def.species
      ? formatText(`${t(`cat_${def.species}`)} ${t("monster_menu_species")}`)
      : "—";
    addText(this, RIGHT_COL_X, BG_Y + 30, speciesText, SMALL).setDepth(5);

    // Height + weight on one line: "69.0 cm 37.0 kg".
    const sizeText =
      def.heightCm !== undefined && def.weightKg !== undefined
        ? `${def.heightCm.toFixed(1)} cm ${def.weightKg.toFixed(1)} kg`
        : "—";
    addText(this, RIGHT_COL_X, BG_Y + 40, sizeText, SMALL).setDepth(5);

    // Type(s) row — icons stacked horizontally next to the "Type(s)" label.
    this.renderTypeRow(def.types, RIGHT_COL_X + 16, BG_Y + 52);

    // Body Type — last row of the top cream panel.
    const shapeText = def.shape
      ? `${t("monster_menu_shape")}: ${t(def.shape)}`
      : `${t("monster_menu_shape")}: —`;
    addText(this, RIGHT_COL_X, BG_Y + 68, shapeText, SMALL).setDepth(5);

    // Description (bottom panel, wordwrapped). Run through formatText so any
    // `${{...}}` in the description resolves (most are parameter-free today,
    // but upstream descriptions reference player + monster vars).
    const descText = def.descriptionKey ? formatText(t(def.descriptionKey)) : "—";
    addText(this, BOTTOM_PANEL_X, DESC_Y, descText, withWrap(SMALL, BOTTOM_PANEL_W)).setDepth(5);

    // Evolution heading — upstream picks one of three keys based on count.
    const evoCount = def.evolutions?.length ?? 0;
    const evoLabelKey =
      evoCount === 0 ? "no_evolution" : evoCount === 1 ? "yes_evolution" : "yes_evolutions";
    addText(this, BOTTOM_PANEL_X, EVO_LABEL_Y, t(evoLabelKey), SMALL_HEADING).setDepth(5);

    // Evolution list — distinct slugs preserving order, uppercased.
    if (def.evolutions && def.evolutions.length > 0) {
      const slugs = Array.from(new Set(def.evolutions.map((e) => e.species)));
      const text = slugs.map((s) => (MONSTERS[s]?.name ?? s).toUpperCase()).join("   ");
      addText(this, BOTTOM_PANEL_X + 8, EVO_LIST_Y, text, SMALL).setDepth(5);
    }
  }

  /**
   * Render the "Type(s)" label with one or two element icons stacked to its
   * left. Mirrors upstream layout: icons go before the label, names go below.
   */
  private renderTypeRow(types: readonly string[], x: number, y: number) {
    // Icons sit to the left of the label column. We push the label right when
    // there are two icons so the second icon doesn't overlap the text.
    const ICON_W = 12;
    const ICON_GAP = 2;
    const iconsTotalW = types.length * ICON_W + Math.max(0, types.length - 1) * ICON_GAP;
    const iconsStartX = x - iconsTotalW - 4;
    for (let i = 0; i < types.length; i++) {
      const key = `elem-${types[i]}`;
      if (this.textures.exists(key)) {
        this.add
          .image(iconsStartX + i * (ICON_W + ICON_GAP), y - 2, key)
          .setOrigin(0, 0)
          .setDepth(5);
      }
    }

    // "Type(s)" label
    addText(this, x, y - 4, t("monster_menu_type"), SMALL).setDepth(5);
    // Type name(s) below the label, e.g. "Wood" or "Wood Frost".
    const names = types.map((tp) => t(tp)).join(" ");
    addText(this, x, y + 6, names, SMALL).setDepth(5);
  }

  // --- Input ---

  private justPressed(name: string): boolean {
    return this.keys[name].isDown && !this.prevKeys[name];
  }

  private isBackPressed(): boolean {
    return (
      this.justPressed("back") ||
      this.justPressed("backX") ||
      this.justPressed("backB") ||
      this.justPressed("backspace") ||
      this.justPressed("backSpace")
    );
  }

  private closeScreen() {
    this.scene.stop("MonsterInfoScene");
  }
}
