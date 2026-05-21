import type { Scene } from "phaser";
import type { Monster } from "../model/Monster";
import { addText, BODY, withColor } from "./textStyle";

export interface PortraitObjects {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  bobTween: Phaser.Tweens.Tween;
}

/**
 * Create a large monster portrait with a gentle bob animation.
 * Uses the battle sprite (frame 0 = front facing).
 */
export function createMonsterPortrait(
  scene: Scene,
  x: number,
  y: number,
  monster: Monster,
  depth: number,
): PortraitObjects {
  const container = scene.add.container(x, y);
  container.setDepth(depth);

  const texture = `${monster.slug}-battle`;
  // 64×64 battle sprite at 1× scale fills ~half the 144 px viewport height —
  // big enough to read at 256×144 without crowding the stats panel.
  const sprite = scene.add.image(0, 0, texture, 0);
  container.add(sprite);

  const bobTween = scene.tweens.add({
    targets: sprite,
    y: -4,
    duration: 1200,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  return { container, sprite, bobTween };
}

export interface StatsObjects {
  container: Phaser.GameObjects.Container;
  labels: Phaser.GameObjects.Text[];
}

/**
 * Render the stat block: Lv, HP, the six combat stats, and XP progress.
 */
export function createStatsDisplay(
  scene: Scene,
  x: number,
  y: number,
  monster: Monster,
  depth: number,
): StatsObjects {
  const container = scene.add.container(x, y);
  container.setDepth(depth);

  const labels: Phaser.GameObjects.Text[] = [];
  const lineH = 9;

  // Single space between label and value — PressStart2P is wider than Arial,
  // so the previous "HP  99/99" with double-space (9 chars × 8 = 72 px)
  // pushed past the 72 px stats-column budget.
  const lines = [
    `Lv ${monster.level}`,
    `HP ${monster.currentHp}/${monster.maxHp}`,
    `MEL ${monster.melee}`,
    `RNG ${monster.ranged}`,
    `ARM ${monster.armor}`,
    `DDG ${monster.dodge}`,
    `SPD ${monster.speed}`,
  ];

  for (let i = 0; i < lines.length; i++) {
    const label = addText(scene, 0, i * lineH, lines[i], BODY);
    labels.push(label);
    container.add(label);
  }

  // XP progress bar — 48 px wide so the label + bar fit inside a 72 px
  // stats column ("XP" label at x=0, bar starting at x=14, ending at 62).
  const xpY = lines.length * lineH + 2;
  const XP_BAR_W = 48;
  const XP_BAR_H = 3;

  const xpLabel = addText(scene, 0, xpY, "XP", withColor(BODY, "#4488ff"));
  labels.push(xpLabel);
  container.add(xpLabel);

  const xpBg = scene.add.rectangle(14 + XP_BAR_W / 2, xpY + 4, XP_BAR_W, XP_BAR_H, 0x222244);
  container.add(xpBg);

  const xpFg = scene.add.rectangle(14 + XP_BAR_W / 2, xpY + 4, XP_BAR_W, XP_BAR_H, 0x4488ff);
  xpFg.setScale(Math.max(0.01, monster.xpProgress), 1);
  container.add(xpFg);

  return { container, labels };
}

/**
 * Render the monster's technique list.
 */
export function createTechniqueList(
  scene: Scene,
  x: number,
  y: number,
  monster: Monster,
  depth: number,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  container.setDepth(depth);

  const header = addText(scene, 0, 0, "Moves:", BODY);
  container.add(header);

  for (let i = 0; i < monster.techniques.length; i++) {
    const tech = monster.techniques[i];
    // Drop the parens — at 8 px PressStart2P, every glyph counts and the
    // techniques column has to fit inside a ~70 px gutter on the party screen.
    const label = addText(scene, 0, 10 + i * 9, `${tech.name} ${tech.dpCost}DP`, BODY);
    container.add(label);
  }

  if (monster.techniques.length === 0) {
    const none = addText(scene, 0, 10, "None", withColor(BODY, "#999999"));
    container.add(none);
  }

  return container;
}
