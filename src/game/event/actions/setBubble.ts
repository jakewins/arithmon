import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

/** Key prefix for bubble objects stored on NPC sprites. */
const BUBBLE_KEY = "__bubble";

const BUBBLE_CHARS: Record<string, string> = {
  exclamation: "!",
  question: "?",
};

class SetBubbleAction implements EventAction {
  type = "set_bubble";
  done = false;

  private npcSlug: string;
  private bubbleType: string | null;

  constructor(args: string[]) {
    this.npcSlug = args[0];
    this.bubbleType = args[1] ?? null;
  }

  start(ctx: EventContext): void {
    const npc = ctx.npcs.get(this.npcSlug);
    if (!npc) {
      console.warn(`set_bubble: NPC "${this.npcSlug}" not found`);
      this.done = true;
      return;
    }

    const sprite = npc.sprite as unknown as Record<string, unknown>;

    // Remove existing bubble
    const existing = sprite[BUBBLE_KEY] as Phaser.GameObjects.Text | undefined;
    if (existing) {
      existing.destroy();
      delete sprite[BUBBLE_KEY];
    }

    if (this.bubbleType) {
      const char = BUBBLE_CHARS[this.bubbleType] ?? this.bubbleType;
      const bubble = ctx.scene.add
        .text(npc.sprite.x, npc.sprite.y - 20, char, {
          fontSize: "12px",
          color: "#ffffff",
          backgroundColor: "#333333",
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setDepth(15);

      sprite[BUBBLE_KEY] = bubble;
    }

    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("set_bubble", (args) => new SetBubbleAction(args));
