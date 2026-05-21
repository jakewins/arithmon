import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class CheckCharParameterCondition implements EventCondition {
  type = "check_char_parameter";

  private target: string;
  private param: string;
  private value: string;

  constructor(args: string[]) {
    // Syntax: check_char_parameter player,param,value
    this.target = args[0];
    this.param = args[1];
    this.value = args[2];
  }

  test(ctx: EventContext): boolean {
    if (this.target !== "player") return false;

    switch (this.param) {
      case "name":
        return ctx.session.player.name === this.value;
      case "gender":
        return ctx.session.player.gender === this.value;
      case "template":
        return ctx.session.player.template === this.value;
      case "moving":
        // Upstream uses this to gate random-encounter Threats events on
        // active movement. `playerMoved` is true on the frame the player
        // transitions to a new tile, matching upstream's per-step polling.
        return (this.value === "1" || this.value === "true") === ctx.playerMoved;
      default:
        return false;
    }
  }
}

registerCondition("check_char_parameter", (args) => new CheckCharParameterCondition(args));
