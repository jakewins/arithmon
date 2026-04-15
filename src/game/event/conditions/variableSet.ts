import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class VariableSetCondition implements EventCondition {
  type = "variable_set";
  private key: string;
  private value: string | undefined;

  constructor(args: string[]) {
    const [keyValue] = args;
    const colonIdx = keyValue.indexOf(":");
    if (colonIdx === -1) {
      // No colon: just check if the variable exists (any value)
      this.key = keyValue;
      this.value = undefined;
    } else {
      this.key = keyValue.slice(0, colonIdx);
      this.value = keyValue.slice(colonIdx + 1);
    }
  }

  test(ctx: EventContext): boolean {
    if (this.value === undefined) {
      return ctx.variables.has(this.key);
    }
    return ctx.variables.get(this.key) === this.value;
  }
}

registerCondition("variable_set", (args) => new VariableSetCondition(args));
