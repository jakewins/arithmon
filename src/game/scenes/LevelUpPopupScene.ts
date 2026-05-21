/**
 * LevelUpPopupScene — modal stat-change summary shown after a player monster
 * gains one or more levels in a battle. Mirrors upstream
 * `LevelUpSummaryState` (`upstream/tuxemon/states/level_up.py:19-90`):
 * monster name, `Lv.X → Lv.Y` subtitle, six stat rows of
 * `STATNAME: OLD → NEW (+DELTA)`, and an `► OK` affordance.
 *
 * Launched on top of CombatScene by `CombatScene.showEndMessage()` after
 * the win message has displayed; dismissal (ENTER / SPACE / ESC / X / B /
 * BACKSPACE) invokes `onDismiss` so the combat scene can tear down and
 * resume OverworldScene.
 */

import { Scene } from "phaser";
import { debugBridge, type DebugStateProvider } from "../debug";
import { SCREEN_W, SCREEN_H } from "../screen";
import type { MonsterStatsSnapshot } from "../model/Monster";
import { addText, NAME, SMALL, SMALL_HEADING } from "../ui/textStyle";

const KEY_ESC = 27;
const KEY_X = 88;
const KEY_BACKSPACE = 8;
const KEY_B = 66;
const KEY_SPACE = 32;
const KEY_ENTER = 13;

const CURSOR_CHAR = "▶";

// Panel chrome — centered cream rectangle with a dark border, matching the
// general aesthetic of upstream's `bg_missions` PygameMenu theme. We don't
// have a 9-slice asset for the level-up panel, so two stacked rectangles
// (border + fill) is the simplest faithful approximation.
const PANEL_W = 132;
const PANEL_H = 116;
const PANEL_X = Math.round((SCREEN_W - PANEL_W) / 2);
const PANEL_Y = Math.round((SCREEN_H - PANEL_H) / 2);
const BORDER_COLOR = 0x8a7355;
const FILL_COLOR = 0xf7efd9;
const BORDER_THICKNESS = 2;

// Stat row layout. Three columns: left-justified LABEL, right-justified OLD,
// then "→ NEW (+DELTA)" starting at a fixed X so arrows line up vertically.
// Upstream renders these in a monospaced font; ours is proportional Pizel so
// we pick column anchors that fit the longest row ("ARMOUR: 145 → 154 (+9)").
const ROW_X_LABEL = PANEL_X + 12;
const ROW_X_OLD_RIGHT = PANEL_X + 78; // right-edge of OLD column
const ROW_X_ARROW = PANEL_X + 82; // "→ NEW (+DELTA)"
const ROW_PITCH = 9;

/** Display order + label mapping. Alphabetical per upstream screenshot. */
const STAT_ROWS: Array<{ key: keyof MonsterStatsSnapshot; label: string }> = [
  { key: "armor", label: "ARMOUR" },
  { key: "dodge", label: "DODGE" },
  { key: "maxHp", label: "HP" },
  { key: "melee", label: "MELEE" },
  { key: "ranged", label: "RANGED" },
  { key: "speed", label: "SPEED" },
];

export interface LevelUpPopupSceneData {
  monsterName: string;
  startLevel: number;
  endLevel: number;
  oldStats: MonsterStatsSnapshot;
  newStats: MonsterStatsSnapshot;
  onDismiss?: () => void;
}

export class LevelUpPopupScene extends Scene implements DebugStateProvider {
  private monsterName = "";
  private startLevel = 0;
  private endLevel = 0;
  private oldStats!: MonsterStatsSnapshot;
  private newStats!: MonsterStatsSnapshot;
  private onDismiss: (() => void) | null = null;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prevKeys: Record<string, boolean> = {};
  private dismissed = false;
  private previousScene: Phaser.Scene | null = null;

  constructor() {
    super("LevelUpPopupScene");
  }

  init(data: LevelUpPopupSceneData) {
    this.monsterName = data?.monsterName ?? "";
    this.startLevel = data?.startLevel ?? 0;
    this.endLevel = data?.endLevel ?? 0;
    this.oldStats = data?.oldStats ?? zeroStats();
    this.newStats = data?.newStats ?? zeroStats();
    this.onDismiss = data?.onDismiss ?? null;
    this.dismissed = false;
  }

  create() {
    this.prevKeys = {};

    // Dim parent — lighter than MonsterInfoScene (0.6 vs 0.85) so the live
    // combat-end frame still shows through the way upstream's panel does.
    this.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x000000, 0.6).setOrigin(0, 0).setDepth(0);

    // Panel chrome: outer border rect then inner cream fill rect.
    this.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, BORDER_COLOR)
      .setOrigin(0, 0)
      .setDepth(1);
    this.add
      .rectangle(
        PANEL_X + BORDER_THICKNESS,
        PANEL_Y + BORDER_THICKNESS,
        PANEL_W - BORDER_THICKNESS * 2,
        PANEL_H - BORDER_THICKNESS * 2,
        FILL_COLOR,
      )
      .setOrigin(0, 0)
      .setDepth(2);

    // Header rows: monster name (centered, NAME style) + `Lv.X → Lv.Y`.
    addText(this, PANEL_X + PANEL_W / 2, PANEL_Y + 8, this.monsterName.toUpperCase(), NAME)
      .setOrigin(0.5, 0)
      .setDepth(5);
    addText(
      this,
      PANEL_X + PANEL_W / 2,
      PANEL_Y + 22,
      `Lv.${this.startLevel} → Lv.${this.endLevel}`,
      SMALL_HEADING,
    )
      .setOrigin(0.5, 0)
      .setDepth(5);

    // Six stat rows — alphabetical (ARMOUR, DODGE, HP, MELEE, RANGED, SPEED).
    const tableTop = PANEL_Y + 38;
    for (let i = 0; i < STAT_ROWS.length; i++) {
      this.renderStatRow(tableTop + i * ROW_PITCH, STAT_ROWS[i].label, STAT_ROWS[i].key);
    }

    // OK affordance — chevron + label, slightly highlighted by being on its
    // own row near the bottom of the panel. Auto-selected; ENTER/SPACE confirm.
    const okY = PANEL_Y + PANEL_H - 14;
    addText(this, PANEL_X + PANEL_W / 2 - 14, okY, CURSOR_CHAR, SMALL).setDepth(5);
    addText(this, PANEL_X + PANEL_W / 2 - 4, okY, "OK", SMALL_HEADING).setDepth(5);

    this.keys = {
      confirmEnter: this.input.keyboard!.addKey(KEY_ENTER),
      confirmSpace: this.input.keyboard!.addKey(KEY_SPACE),
      back: this.input.keyboard!.addKey(KEY_ESC),
      backX: this.input.keyboard!.addKey(KEY_X),
      backB: this.input.keyboard!.addKey(KEY_B),
      backspace: this.input.keyboard!.addKey(KEY_BACKSPACE),
    };

    // Stash + restore the active scene the same way MonsterInfoScene does —
    // we're launched on top, so the parent won't re-register itself.
    this.previousScene = debugBridge.getActiveScene();
    debugBridge.setScene(this);
    debugBridge.emit("scene_started", {
      scene: "LevelUpPopupScene",
      monster: this.monsterName,
      startLevel: this.startLevel,
      endLevel: this.endLevel,
    });

    this.events.once("shutdown", () => {
      if (this.previousScene) debugBridge.setScene(this.previousScene);
      debugBridge.emit("scene_stopped", { scene: "LevelUpPopupScene" });
    });
  }

  update() {
    if (this.dismissed) return;
    if (this.isConfirmOrBackPressed()) {
      this.dismiss();
      return;
    }
    for (const [name, key] of Object.entries(this.keys)) {
      this.prevKeys[name] = key.isDown;
    }
  }

  getDebugState(): Record<string, unknown> {
    return {
      levelUpPopup: {
        monsterName: this.monsterName,
        startLevel: this.startLevel,
        endLevel: this.endLevel,
      },
    };
  }

  private renderStatRow(y: number, label: string, key: keyof MonsterStatsSnapshot) {
    const oldVal = this.oldStats[key];
    const newVal = this.newStats[key];
    const delta = newVal - oldVal;
    const sign = delta > 0 ? "+" : "";

    addText(this, ROW_X_LABEL, y, `${label}:`, SMALL).setDepth(5);
    addText(this, ROW_X_OLD_RIGHT, y, `${oldVal}`, SMALL).setOrigin(1, 0).setDepth(5);
    addText(this, ROW_X_ARROW, y, `→ ${newVal} (${sign}${delta})`, SMALL).setDepth(5);
  }

  private justPressed(name: string): boolean {
    return this.keys[name].isDown && !this.prevKeys[name];
  }

  private isConfirmOrBackPressed(): boolean {
    return (
      this.justPressed("confirmEnter") ||
      this.justPressed("confirmSpace") ||
      this.justPressed("back") ||
      this.justPressed("backX") ||
      this.justPressed("backB") ||
      this.justPressed("backspace")
    );
  }

  private dismiss() {
    this.dismissed = true;
    // Stop ourselves first so the parent scene reactivates input cleanly,
    // then run the dismissal callback (which typically tears down CombatScene).
    const cb = this.onDismiss;
    this.onDismiss = null;
    this.scene.stop("LevelUpPopupScene");
    cb?.();
  }
}

function zeroStats(): MonsterStatsSnapshot {
  return { maxHp: 0, melee: 0, ranged: 0, armor: 0, dodge: 0, speed: 0 };
}
