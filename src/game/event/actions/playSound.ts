import type { EventAction } from "../types";
import { registerAction } from "../registry";

class PlaySoundAction implements EventAction {
  type = "play_sound";
  done = false;
  private key: string;

  constructor(args: string[]) {
    this.key = args[0];
  }

  start(): void {
    console.log(`[play_sound] ${this.key} (stub — no audio yet)`);
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("play_sound", (args) => new PlaySoundAction(args));
