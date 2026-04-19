import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class EnvironmentIsCondition implements EventCondition {
  type = "environment_is";
  private env: string;

  constructor(args: string[]) {
    this.env = args[0];
  }

  test(ctx: EventContext): boolean {
    return ctx.session.environment === this.env;
  }
}

registerCondition("environment_is", (args) => new EnvironmentIsCondition(args));
