import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class VariableSetCondition implements EventCondition {
  type = "variable_set";
  private key: string;
  private value: string;

  constructor(args: string[]) {
    const [keyValue] = args;
    const colonIdx = keyValue.indexOf(":");
    this.key = keyValue.slice(0, colonIdx);
    this.value = keyValue.slice(colonIdx + 1);
  }

  test(ctx: EventContext): boolean {
    return ctx.variables.get(this.key) === this.value;
  }
}

registerCondition("variable_set", (args) => new VariableSetCondition(args));
