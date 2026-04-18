import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class ClearVariableAction implements EventAction {
  type = "clear_variable";
  done = false;

  private key: string;

  constructor(args: string[]) {
    this.key = args[0];
  }

  start(ctx: EventContext): void {
    ctx.variables.remove(this.key);
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("clear_variable", (args) => new ClearVariableAction(args));
