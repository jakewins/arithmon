import type { Scene } from "phaser";
import type { Monster } from "../model/Monster";

// Slot widget sized for the 256×144 viewport: ~70 px wide total (bar + label).
const HP_BAR_W = 50;
const HP_BAR_H = 3;
const TEXT_COLOR = "#1a1a1a";
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
  const color = fainted ? DISABLED_COLOR : TEXT_COLOR;

  const nameText = fainted
    ? `${monster.name} Lv${monster.level} KO`
    : `${monster.name} Lv${monster.level}`;

  const nameLabel = scene.add.text(0, 0, nameText, {
    fontSize: "8px",
    color,
  });
  container.add(nameLabel);

  // HP bar background
  const hpBarBg = scene.add.rectangle(HP_BAR_W / 2, 11, HP_BAR_W, HP_BAR_H, 0x333333);
  container.add(hpBarBg);

  // HP bar foreground
  const ratio = monster.currentHp / monster.maxHp;
  const hpBarFg = scene.add.rectangle(HP_BAR_W / 2, 11, HP_BAR_W, HP_BAR_H, hpColor(ratio));
  hpBarFg.setScale(Math.max(0, ratio), 1);
  container.add(hpBarFg);

  // HP text
  const hpLabel = scene.add.text(HP_BAR_W + 3, 8, `${monster.currentHp}/${monster.maxHp}`, {
    fontSize: "8px",
    color,
  });
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

  const label = scene.add.text(0, 4, "- - - - -", {
    fontSize: "8px",
    color: DISABLED_COLOR,
  });
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
