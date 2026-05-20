import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

/**
 * `play_music <key>` — we don't have an audio engine yet, but we still record
 * the current track on the session so the `music_playing` condition can gate
 * the "Play Music" trigger to fire only once per map (otherwise paper_town
 * would re-fire it every frame, flooding the log).
 */
class PlayMusicAction implements EventAction {
  type = "play_music";
  done = false;
  private key: string;

  constructor(args: string[]) {
    this.key = args[0];
  }

  start(ctx: EventContext): void {
    if (ctx.session.musicPlaying !== this.key) {
      console.log(`[play_music] ${this.key} (stub — no audio yet)`);
    }
    ctx.session.musicPlaying = this.key;
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("play_music", (args) => new PlayMusicAction(args));
