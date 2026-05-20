import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { markSeen } from "../../model/monsterRegistry";

/**
 * `open_journal <monster_slug>` — pushes `MonsterInfoScene` (single-monster
 * Pokédex-style detail page) on top of the current scene, then blocks the
 * event queue until the player closes it. Mirrors upstream `open_journal.py`
 * which pushes `JournalInfoState` with `reveal=True`.
 *
 * The action stays `done = false` while `MonsterInfoScene` is active so that
 * any subsequent actions in the same event (e.g. a follow-up dialog) wait for
 * the player to dismiss the journal first.
 */
class OpenJournalAction implements EventAction {
  type = "open_journal";
  done = false;

  private monsterSlug: string | undefined;
  private launched = false;

  constructor(args: string[]) {
    this.monsterSlug = args[0];
  }

  start(ctx: EventContext): void {
    // Match upstream: looking at a monster in the journal marks it as seen.
    if (this.monsterSlug) {
      markSeen(ctx.session.monsterRegistry, this.monsterSlug);
    }

    if (!this.monsterSlug) {
      // No slug → nothing to show; succeed immediately.
      this.done = true;
      return;
    }

    ctx.scene.scene.launch("MonsterInfoScene", { slug: this.monsterSlug });
    this.launched = true;
  }

  update(ctx: EventContext): void {
    if (!this.launched) return;
    // Mirror upstream's `if "JournalInfoState" not in active_state_names:` —
    // we hold this action open until the modal scene actually shuts down.
    if (!ctx.scene.scene.isActive("MonsterInfoScene")) {
      this.done = true;
    }
  }

  cleanup(): void {}
}

registerAction("open_journal", (args) => new OpenJournalAction(args));
