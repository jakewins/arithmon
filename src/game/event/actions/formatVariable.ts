import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class FormatVariableAction implements EventAction {
  type = "format_variable";
  done = false;

  private key: string;
  private targetType: string;

  constructor(args: string[]) {
    this.key = args[0];
    this.targetType = args[1] ?? "int";
  }

  start(ctx: EventContext): void {
    const raw = ctx.variables.get(this.key);
    if (raw === undefined) {
      this.done = true;
      return;
    }

    let converted: string;
    switch (this.targetType) {
      case "int":
        converted = String(Math.floor(parseFloat(raw)) || 0);
        break;
      case "float":
        converted = String(parseFloat(raw) || 0);
        break;
      case "string":
      default:
        converted = raw;
        break;
    }

    ctx.variables.set(this.key, converted);
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("format_variable", (args) => new FormatVariableAction(args));
