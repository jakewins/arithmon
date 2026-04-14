import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class ButtonPressedCondition implements EventCondition {
  type = "button_pressed";
  private button: string;

  constructor(args: string[]) {
    this.button = args[0] ?? "INTERACT";
  }

  test(ctx: EventContext): boolean {
    if (this.button === "INTERACT") return ctx.interactPressed;
    return false;
  }
}

registerCondition("button_pressed", (args) => new ButtonPressedCondition(args));
