import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class LocationTypeCondition implements EventCondition {
  type = "location_type";
  private locType: string;

  constructor(args: string[]) {
    this.locType = args[0] ?? "";
  }

  test(ctx: EventContext): boolean {
    return ctx.session.locationType === this.locType;
  }
}

registerCondition("location_type", (args) => new LocationTypeCondition(args));
