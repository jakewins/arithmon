import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class CharTalkAction implements EventAction {
  type = "char_talk";
  done = false;
  private npcSlug: string;
  private speechType: string;

  constructor(args: string[]) {
    // Format: npc_slug,speech_type
    this.npcSlug = args[0];
    this.speechType = args[1] ?? "default";
  }

  start(ctx: EventContext): void {
    // Look up NPC speech profile from variables (set by event YAML)
    const dialogKey = ctx.variables.get(`dialog_${this.npcSlug}_${this.speechType}`);
    if (dialogKey) {
      console.log(`char_talk: ${this.npcSlug} says "${dialogKey}" (${this.speechType})`);
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("char_talk", (args) => new CharTalkAction(args));
