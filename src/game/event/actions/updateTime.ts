import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import type { GameSession } from "../../session";

function getTimeStage(): GameSession["timeStage"] {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 19) return "dusk";
  return "night";
}

class UpdateTimeAction implements EventAction {
  type = "update_time";
  done = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_args: string[]) {}

  start(ctx: EventContext): void {
    ctx.session.timeStage = getTimeStage();
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("update_time", (args) => new UpdateTimeAction(args));
