import type { EventAction } from "../types";
import { registerAction } from "../registry";

class PlayMusicAction implements EventAction {
  type = "play_music";
  done = false;
  private key: string;

  constructor(args: string[]) {
    this.key = args[0];
  }

  start(): void {
    console.log(`[play_music] ${this.key} (stub — no audio yet)`);
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("play_music", (args) => new PlayMusicAction(args));
