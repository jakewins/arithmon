import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { markSeen } from "../../model/monsterRegistry";

class OpenJournalAction implements EventAction {
  type = "open_journal";
  done = false;

  private monsterSlug: string | undefined;

  constructor(args: string[]) {
    this.monsterSlug = args[0];
  }

  start(ctx: EventContext): void {
    // Ensure the monster is at least "seen" so it appears in the journal
    if (this.monsterSlug) {
      markSeen(ctx.session.monsterRegistry, this.monsterSlug);
    }

    ctx.scene.scene.launch("JournalScene");
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("open_journal", (args) => new OpenJournalAction(args));
