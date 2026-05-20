import type { Scene } from "phaser";
import type { Monster } from "../model/Monster";

const TEXT_COLOR = "#1a1a1a";

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

  const lines = [
    `Lv ${monster.level}`,
    `HP  ${monster.currentHp}/${monster.maxHp}`,
    `MEL ${monster.melee}`,
    `RNG ${monster.ranged}`,
    `ARM ${monster.armor}`,
    `DDG ${monster.dodge}`,
    `SPD ${monster.speed}`,
  ];

  for (let i = 0; i < lines.length; i++) {
    const label = scene.add.text(0, i * lineH, lines[i], {
      fontSize: "8px",
      color: TEXT_COLOR,
    });
    labels.push(label);
    container.add(label);
  }

  // XP progress bar
  const xpY = lines.length * lineH + 2;
  const XP_BAR_W = 64;
  const XP_BAR_H = 3;

  const xpLabel = scene.add.text(0, xpY, "XP", { fontSize: "8px", color: "#4488ff" });
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

  const header = scene.add.text(0, 0, "Moves:", {
    fontSize: "8px",
    color: TEXT_COLOR,
  });
  container.add(header);

  for (let i = 0; i < monster.techniques.length; i++) {
    const tech = monster.techniques[i];
    const label = scene.add.text(0, 10 + i * 9, `${tech.name} (${tech.dpCost}DP)`, {
      fontSize: "8px",
      color: TEXT_COLOR,
    });
    container.add(label);
  }

  if (monster.techniques.length === 0) {
    const none = scene.add.text(0, 10, "None", { fontSize: "8px", color: "#999999" });
    container.add(none);
  }

  return container;
}
