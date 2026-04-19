import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class LocationInsideCondition implements EventCondition {
  type = "location_inside";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_args: string[]) {}

  test(ctx: EventContext): boolean {
    return ctx.session.inside;
  }
}

registerCondition("location_inside", (args) => new LocationInsideCondition(args));
