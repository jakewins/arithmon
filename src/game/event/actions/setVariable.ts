import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { debugBridge } from "../../debug";

class SetVariableAction implements EventAction {
  type = "set_variable";
  done = false;

  private key: string;
  private value: string;

  constructor(args: string[]) {
    const [keyValue] = args;
    const colonIdx = keyValue.indexOf(":");
    this.key = keyValue.slice(0, colonIdx);
    this.value = keyValue.slice(colonIdx + 1);
  }

  start(ctx: EventContext): void {
    ctx.variables.set(this.key, this.value);
    debugBridge.emit("variable_set", { key: this.key, value: this.value });
    this.done = true;
  }

  update(): void {
    // single-frame action
  }

  cleanup(): void {
    // nothing to clean up
  }
}

registerAction("set_variable", (args) => new SetVariableAction(args));
