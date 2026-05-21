import type { Scene } from "phaser";
import type { Monster } from "../model/Monster";
import { addText, BODY, withColor } from "./textStyle";

// Slot widget sized for the 256×144 viewport: ~80 px wide total (bar + label).
// The bar shrank from 50 → 36 px to leave room for "99/99" at 8 px PressStart2P
// (5 chars ≈ 40 px) without clipping the right edge of the party-screen panel.
const HP_BAR_W = 36;
const HP_BAR_H = 3;
const DISABLED_COLOR = "#999999";

export interface MonsterSlotObjects {
  container: Phaser.GameObjects.Container;
  nameLabel: Phaser.GameObjects.Text;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFg: Phaser.GameObjects.Rectangle;
  hpLabel: Phaser.GameObjects.Text;
}

function hpColor(ratio: number): number {
  if (ratio > 0.5) return 0x44cc44;
  if (ratio > 0.2) return 0xcccc44;
  return 0xcc4444;
}

/**
 * Render a monster slot: name + level on one line, HP bar + HP text below.
 * Returns the game objects so the caller can position/destroy them.
 */
export function createMonsterSlot(
  scene: Scene,
  x: number,
  y: number,
  monster: Monster,
  depth: number,
): MonsterSlotObjects {
  const container = scene.add.container(x, y);
  container.setDepth(depth);

  const fainted = monster.fainted;
  const style = fainted ? withColor(BODY, DISABLED_COLOR) : BODY;

  const nameText = fainted
    ? `${monster.name} Lv${monster.level} KO`
    : `${monster.name} Lv${monster.level}`;

  const nameLabel = addText(scene, 0, 0, nameText, style);
  container.add(nameLabel);

  // HP bar + text on a second row below the name. PressStart2P glyphs are
  // ~8 px tall, so the bar/text sit at y=12 to clear the name's bounding box
  // without overlapping the slot below (slot pitch in PartyScreen is 22 px).
  const hpBarBg = scene.add.rectangle(HP_BAR_W / 2, 13, HP_BAR_W, HP_BAR_H, 0x333333);
  container.add(hpBarBg);

  // HP bar foreground
  const ratio = monster.currentHp / monster.maxHp;
  const hpBarFg = scene.add.rectangle(HP_BAR_W / 2, 13, HP_BAR_W, HP_BAR_H, hpColor(ratio));
  hpBarFg.setScale(Math.max(0, ratio), 1);
  container.add(hpBarFg);

  // HP text — same row as the bar, just to its right.
  const hpLabel = addText(scene, HP_BAR_W + 3, 10, `${monster.currentHp}/${monster.maxHp}`, style);
  container.add(hpLabel);

  return { container, nameLabel, hpBarBg, hpBarFg, hpLabel };
}

/** Render an empty slot placeholder. */
export function createEmptySlot(
  scene: Scene,
  x: number,
  y: number,
  depth: number,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  container.setDepth(depth);

  const label = addText(scene, 0, 4, "- - - - -", withColor(BODY, DISABLED_COLOR));
  container.add(label);

  return container;
}

/** Update an existing slot's HP bar and text. */
export function updateSlotHp(slot: MonsterSlotObjects, monster: Monster): void {
  const ratio = monster.currentHp / monster.maxHp;
  slot.hpBarFg.setScale(Math.max(0, ratio), 1);
  slot.hpBarFg.setFillStyle(hpColor(ratio));
  slot.hpLabel.setText(`${monster.currentHp}/${monster.maxHp}`);
}
