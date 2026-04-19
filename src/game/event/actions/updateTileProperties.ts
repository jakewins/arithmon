import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class UpdateTilePropertiesAction implements EventAction {
  type = "update_tile_properties";
  done = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_args: string[]) {}

  start(ctx: EventContext): void {
    // Store the fact that tile properties were updated (for tile_property_updated condition)
    ctx.variables.set("__tile_properties_updated", "true");
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("update_tile_properties", (args) => new UpdateTilePropertiesAction(args));
