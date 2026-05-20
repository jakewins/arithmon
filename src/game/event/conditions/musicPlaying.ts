import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

/**
 * `music_playing <key>` — true when `play_music <key>` is the current track
 * on the session. Maps gate their "Play Music" trigger with
 *   conditions: [not music_playing <key>]
 * so it fires exactly once per map load.
 */
class MusicPlayingCondition implements EventCondition {
  type = "music_playing";
  private key: string;

  constructor(args: string[]) {
    this.key = args[0] ?? "";
  }

  test(ctx: EventContext): boolean {
    return ctx.session.musicPlaying === this.key;
  }
}

registerCondition("music_playing", (args) => new MusicPlayingCondition(args));
