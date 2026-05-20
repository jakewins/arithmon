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
  /**
   * Set to true once the modal has actually been seen as active. We can't
   * use `scene.isActive("MonsterInfoScene")` for the close detection until
   * we've observed it as `true` at least once — Phaser doesn't add the new
   * scene to the active list until the next scene-manager tick after
   * `scene.launch`, so a same-frame `isActive` check returns `false` and
   * would prematurely mark the action complete.
   */
  private modalSeen = false;

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

    // Belt: hook the modal's shutdown event for the canonical close signal.
    // The polled isActive check below is the suspenders. `get` may be
    // unavailable on harness/test scene stubs — guard for that.
    const sceneMgr = ctx.scene.scene as unknown as {
      get?: (k: string) => { events?: { once?: (e: string, cb: () => void) => void } };
    };
    const modal = sceneMgr.get?.("MonsterInfoScene");
    modal?.events?.once?.("shutdown", () => {
      this.done = true;
    });
  }

  update(ctx: EventContext): void {
    if (!this.launched) return;
    const active = ctx.scene.scene.isActive("MonsterInfoScene");
    if (active) {
      this.modalSeen = true;
    } else if (this.modalSeen) {
      // Was active, now isn't — modal closed.
      this.done = true;
    }
    // If !active && !this.modalSeen, the scene-manager hasn't promoted the
    // launched scene to active yet — wait another frame.
  }

  cleanup(): void {}
}

registerAction("open_journal", (args) => new OpenJournalAction(args));
