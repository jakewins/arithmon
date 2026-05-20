import { Scene } from "phaser";
import {
  RACE_DEFAULTS,
  debugBridge,
  type DebugCommandHandler,
  type DebugStateProvider,
} from "../debug";
import { clearSave, hasSave } from "../save";
import { session } from "../session";
import type { OverworldInitData } from "./OverworldScene";

// Hard-coded "New Game" appearance — upstream Tuxemon prompts for these via
// the start_tuxemon.yaml cutscene, but we only ship the Spyder campaign and
// pre-pick the male/white adventurer combo our QA scripts use everywhere
// else (see RACE_DEFAULTS in debug.ts and setupGame()'s defaults).
const NEW_GAME_SCENARIO = "spyder_campaign";
const NEW_GAME_GENDER = "gender_male";
const NEW_GAME_RACE = "white_male";

// Where a new game drops the player — upstream's start_tuxemon.yaml ends with
// `transition_teleport player,spyder_bedroom.tmx,4,4,0.3`, so match that.
const NEW_GAME_MAP = "spyder_bedroom";
const NEW_GAME_SPAWN_X = 4;
const NEW_GAME_SPAWN_Y = 4;

// Mirrors upstream Tuxemon's StartState — the first thing the player sees on
// boot. Shows the title plus "New Game" and (when a save exists) "Load Game".
// Upstream lives at upstream/tuxemon/states/start.py.

const WIDTH = 320;
const BORDER_TEXTURE = "dialog-border";
const BORDER_SLICE = 3;

// Matches `change_bg gradient_blue` (see changeBgShared.ts) so the title
// screen sits on the same blue used by the character-creation cutscene.
const BG_COLOR = 0x2244aa;

const TITLE_COLOR = "#ffffff";
const TEXT_COLOR = "#1a1a1a";
const CURSOR_CHAR = "▶";

// Key codes — same set the pause menu uses.
const KEY_UP = 38;
const KEY_DOWN = 40;
const KEY_SPACE = 32;
const KEY_Z = 90;
const KEY_ENTER = 13;

const PANEL_W = 120;
const PANEL_H_PER_OPT = 16;
const PANEL_PAD_Y = 10;

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
    // load the nine-slice border ourselves rather than relying on it being in
    // the texture cache already.
    this.load.image(BORDER_TEXTURE, "assets/ui/dialog-border.png");
  }

  create() {
    this.selected = 0;
    this.labels = [];
    this.prevKeys = {};

    this.cameras.main.setBackgroundColor(BG_COLOR);

    // Title text
    this.add
      .text(WIDTH / 2, 50, "Arithmon", {
        fontSize: "32px",
        color: TITLE_COLOR,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    this.add
      .text(WIDTH / 2, 90, "A Tuxemon clone with math", {
        fontSize: "10px",
        color: TITLE_COLOR,
      })
      .setOrigin(0.5, 0);

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
    const panelY = 150 + panelH / 2;

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
    const labelX = panelX - PANEL_W / 2 + 24;
    for (let i = 0; i < this.options.length; i++) {
      const label = this.add.text(
        labelX,
        optionsStartY + i * PANEL_H_PER_OPT,
        this.options[i].label,
        {
          fontSize: "11px",
          color: TEXT_COLOR,
        },
      );
      this.labels.push(label);
    }

    this.cursor = this.add.text(labelX - 12, optionsStartY, CURSOR_CHAR, {
      fontSize: "11px",
      color: TEXT_COLOR,
    });

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
    // Wipe any persisted save + reset session in case the user is starting
    // fresh after a previous playthrough.
    clearSave();

    // Pre-set the variables and template that upstream's start_tuxemon.yaml
    // would otherwise prompt for. We only ship the Spyder campaign and use a
    // fixed default appearance, so the campaign/gender/race chooser is gone
    // (STORY-0194). The variables are still set so the rest of the Spyder
    // intro events (which gate on `is variable_set scenario_choice` etc.)
    // continue to work, and so setupGame() / save state stay consistent.
    const vars = session.player.gameVariables;
    vars.set("scenario_choice", NEW_GAME_SCENARIO);
    vars.set("gender_choice", NEW_GAME_GENDER);
    vars.set("race_choice", NEW_GAME_RACE);
    const appearance = RACE_DEFAULTS[NEW_GAME_RACE];
    session.player.template = appearance.template;
    session.player.gender = appearance.gender;

    // Boot directly into the Spyder bedroom — upstream teleports here as the
    // final step of start_tuxemon.yaml; we just skip the prompts.
    this.scene.start("OverworldScene", {
      mapKey: NEW_GAME_MAP,
      spawnTileX: NEW_GAME_SPAWN_X,
      spawnTileY: NEW_GAME_SPAWN_Y,
      spawnFacing: "down",
    } satisfies OverworldInitData);
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
