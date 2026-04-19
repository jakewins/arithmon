import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class TilePropertyUpdatedCondition implements EventCondition {
  type = "tile_property_updated";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_args: string[]) {}

  test(ctx: EventContext): boolean {
    return ctx.variables.get("__tile_properties_updated") === "true";
  }
}

registerCondition("tile_property_updated", (args) => new TilePropertyUpdatedCondition(args));
