import { Scene } from "phaser";
import { debugBridge, type DebugCommandHandler, type DebugStateProvider } from "../debug";
import { clearSave, hasSave } from "../save";
import { PLAYER_SPRITE_TEMPLATES } from "../data/npcs";
import { SCREEN_W } from "../screen";
import { BODY, BODY_LIGHT, TITLE } from "../ui/textStyle";

// Mirrors upstream Tuxemon's StartState — the first thing the player sees on
// boot. Shows the title plus "New Game" and (when a save exists) "Load Game".
// Upstream lives at upstream/tuxemon/states/start.py.
//
// "New Game" hands off to CutsceneScene running start_tuxemon.yaml, which
// asks the player for campaign/gender/race and then transition_teleports
// into spyder_bedroom — matching upstream's flow byte-for-byte.

const WIDTH = SCREEN_W;
const BORDER_TEXTURE = "dialog-border";
const BORDER_SLICE = 3;

// Matches `change_bg gradient_blue` (see changeBgShared.ts) so the title
// screen sits on the same blue used by the character-creation cutscene.
const BG_COLOR = 0x2244aa;

const CURSOR_CHAR = "▶";

// Key codes — same set the pause menu uses.
const KEY_UP = 38;
const KEY_DOWN = 40;
const KEY_SPACE = 32;
const KEY_Z = 90;
const KEY_ENTER = 13;

const PANEL_W = 88;
const PANEL_H_PER_OPT = 12;
const PANEL_PAD_Y = 6;

interface MenuOption {
  id: "new_game" | "load_game";
  label: string;
  action: () => void;
}

export class TitleScene extends Scene implements DebugStateProvider, DebugCommandHandler {
  private options: MenuOption[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private selected = 0;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prevKeys: Record<string, boolean> = {};

  constructor() {
    super("TitleScene");
  }

  preload() {
    // TitleScene boots before any other scene runs its preload, so we have to
    // load any assets the New Game cutscene (start_tuxemon.yaml) needs ahead
    // of CutsceneScene starting. OverworldScene preloads its own copies on
    // first start; Phaser dedupes by key so the second load is a no-op.
    this.load.image(BORDER_TEXTURE, "assets/ui/dialog-border.png");
    this.load.image("choice_gender", "assets/ui/background/choice_gender.png");
    this.load.text("start-tuxemon", "assets/events/start_tuxemon.yaml");
    this.load.text("i18n-en", "assets/l10n/en_US.po");
    // Player sprites — set_template applied during character creation needs
    // these resolvable when OverworldScene mounts the player after teleport.
    for (const template of PLAYER_SPRITE_TEMPLATES) {
      this.load.spritesheet(template, `assets/sprites/${template}.png`, {
        frameWidth: 16,
        frameHeight: 32,
      });
    }
  }

  create() {
    this.selected = 0;
    this.labels = [];
    this.prevKeys = {};

    this.cameras.main.setBackgroundColor(BG_COLOR);

    // Title text — sized to fit the 256×144 viewport without dominating it.
    // PressStart2P at 16 px (TITLE) is a clean 2× of the body grid; 20 px
    // would scale to fractional pixels and fuzz at integer zoom.
    this.add.text(WIDTH / 2, 20, "Arithmon", TITLE).setOrigin(0.5, 0);

    this.add.text(WIDTH / 2, 48, "A Tuxemon clone with math", BODY_LIGHT).setOrigin(0.5, 0);

    // Build menu options. "Load Game" only appears when a save exists.
    this.options = [];
    if (hasSave()) {
      this.options.push({
        id: "load_game",
        label: "Load Game",
        action: () => this.onLoadGame(),
      });
    }
    this.options.push({
      id: "new_game",
      label: "New Game",
      action: () => this.onNewGame(),
    });

    const panelH = this.options.length * PANEL_H_PER_OPT + PANEL_PAD_Y * 2;
    const panelX = WIDTH / 2;
    const panelY = 80 + panelH / 2;

    this.add.nineslice(
      panelX,
      panelY,
      BORDER_TEXTURE,
      undefined,
      PANEL_W,
      panelH,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
      BORDER_SLICE,
    );

    // Labels
    const optionsStartY = panelY - panelH / 2 + PANEL_PAD_Y;
    const labelX = panelX - PANEL_W / 2 + 16;
    for (let i = 0; i < this.options.length; i++) {
      const label = this.add.text(
        labelX,
        optionsStartY + i * PANEL_H_PER_OPT,
        this.options[i].label,
        BODY,
      );
      this.labels.push(label);
    }

    this.cursor = this.add.text(labelX - 8, optionsStartY, CURSOR_CHAR, BODY);

    this.keys = {
      up: this.input.keyboard!.addKey(KEY_UP),
      down: this.input.keyboard!.addKey(KEY_DOWN),
      confirm: this.input.keyboard!.addKey(KEY_SPACE),
      confirmZ: this.input.keyboard!.addKey(KEY_Z),
      confirmEnter: this.input.keyboard!.addKey(KEY_ENTER),
    };

    debugBridge.setScene(this);
    debugBridge.emit("scene_started", { scene: "TitleScene" });

    this.events.once("shutdown", () => {
      debugBridge.emit("scene_stopped", { scene: "TitleScene" });
    });
  }

  update() {
    const justPressed = (name: string): boolean => {
      const key = this.keys[name];
      const wasDown = this.prevKeys[name] ?? false;
      const isDown = key.isDown;
      this.prevKeys[name] = isDown;
      return isDown && !wasDown;
    };

    // Read all keys up-front so prevKeys is updated even for keys not pressed.
    const up = justPressed("up");
    const down = justPressed("down");
    const confirm =
      justPressed("confirm") || justPressed("confirmZ") || justPressed("confirmEnter");

    if (up) {
      this.selected = (this.selected - 1 + this.options.length) % this.options.length;
      this.updateCursor();
    }
    if (down) {
      this.selected = (this.selected + 1) % this.options.length;
      this.updateCursor();
    }
    if (confirm) {
      this.options[this.selected].action();
    }
  }

  private updateCursor() {
    const optionsStartY = this.labels[0]?.y ?? 0;
    this.cursor.setY(optionsStartY + this.selected * PANEL_H_PER_OPT);
  }

  private onNewGame() {
    debugBridge.emit("title_menu_selected", { option: "new_game" });
    // Wipe any persisted save so the character-creation cutscene starts from
    // a clean slate (no leftover scenario_choice/gender_choice/race_choice).
    clearSave();

    // Hand off to start_tuxemon.yaml. It runs the three dialog choices
    // (campaign → gender → race), applies set_template + set_char_attribute,
    // then transition_teleports into spyder_bedroom — at which point
    // CutsceneScene starts OverworldScene for us.
    this.scene.start("CutsceneScene", { yamlKey: "start-tuxemon" });
  }

  private onLoadGame() {
    debugBridge.emit("title_menu_selected", { option: "load_game" });
    // loadGame() has already run during boot (src/game/main.ts), so the
    // session + pendingSavedLocation are populated. OverworldScene.init
    // consumes the saved location automatically.
    this.scene.start("OverworldScene");
  }

  getDebugState(): Record<string, unknown> {
    return {
      title: {
        selected: this.selected,
        selectedOption: this.options[this.selected]?.id ?? null,
        options: this.options.map((o) => o.id),
      },
    };
  }

  // --- DebugCommandHandler ---

  debugSetInteract(): void {
    this.options[this.selected]?.action();
  }

  debugSelectChoice(index: number): void {
    if (index >= 0 && index < this.options.length) {
      this.selected = index;
      this.updateCursor();
    }
  }

  debugIsBlocking(): boolean {
    return false;
  }
}
