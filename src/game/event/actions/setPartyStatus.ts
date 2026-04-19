import type { EventAction } from "../types";
import { registerAction } from "../registry";

class SetPartyStatusAction implements EventAction {
  type = "set_party_status";
  done = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_args: string[]) {}

  start(): void {
    // Party status display is managed by the UI — this is a no-op trigger
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("set_party_status", (args) => new SetPartyStatusAction(args));
