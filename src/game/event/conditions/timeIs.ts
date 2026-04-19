import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class TimeIsCondition implements EventCondition {
  type = "time_is";
  private field: string;
  private operator: string;
  private value: string;

  constructor(args: string[]) {
    // Format: stage_of_day,equals,night
    this.field = args[0] ?? "stage_of_day";
    this.operator = args[1] ?? "equals";
    this.value = args[2] ?? "day";
  }

  test(ctx: EventContext): boolean {
    if (this.field === "stage_of_day" && this.operator === "equals") {
      return ctx.session.timeStage === this.value;
    }
    return false;
  }
}

registerCondition("time_is", (args) => new TimeIsCondition(args));
