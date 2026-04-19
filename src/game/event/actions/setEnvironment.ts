import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class SetEnvironmentAction implements EventAction {
  type = "set_environment";
  done = false;
  private env: string;

  constructor(args: string[]) {
    this.env = args[0] ?? "grass";
  }

  start(ctx: EventContext): void {
    ctx.session.environment = this.env;
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("set_environment", (args) => new SetEnvironmentAction(args));
