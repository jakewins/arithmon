import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class SetKennelVisibleAction implements EventAction {
  type = "set_kennel_visible";
  done = false;
  private kennelName: string;
  private visible: boolean;

  constructor(args: string[]) {
    // Format: player,kennel_name,true|false
    this.kennelName = args[1] ?? "Kennel";
    this.visible = args[2] !== "false";
  }

  start(ctx: EventContext): void {
    const kennel = ctx.session.kennels[this.kennelName];
    if (kennel) {
      kennel.visible = this.visible;
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("set_kennel_visible", (args) => new SetKennelVisibleAction(args));
