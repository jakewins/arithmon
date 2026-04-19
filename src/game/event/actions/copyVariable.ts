import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class CopyVariableAction implements EventAction {
  type = "copy_variable";
  done = false;

  private sourceKey: string;
  private destKey: string;

  constructor(args: string[]) {
    // Format: player,source_key,dest_key
    const [, sourceKey, destKey] = args;
    this.sourceKey = sourceKey;
    this.destKey = destKey;
  }

  start(ctx: EventContext): void {
    const value = ctx.variables.get(this.sourceKey);
    if (value !== undefined) {
      ctx.variables.set(this.destKey, value);
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("copy_variable", (args) => new CopyVariableAction(args));
