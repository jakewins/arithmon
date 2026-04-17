import type { EventCondition } from "../types";
import { registerCondition } from "../registry";

class MusicPlayingCondition implements EventCondition {
  type = "music_playing";

  test(): boolean {
    return false;
  }
}

registerCondition("music_playing", () => new MusicPlayingCondition());
