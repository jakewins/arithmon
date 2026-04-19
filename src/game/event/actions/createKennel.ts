import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class CreateKennelAction implements EventAction {
  type = "create_kennel";
  done = false;
  private kennelName: string;

  constructor(args: string[]) {
    // Format: player,kennel_name
    this.kennelName = args[1] ?? "Kennel";
  }

  start(ctx: EventContext): void {
    if (!ctx.session.kennels[this.kennelName]) {
      ctx.session.kennels[this.kennelName] = { monsters: [], visible: true };
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("create_kennel", (args) => new CreateKennelAction(args));
