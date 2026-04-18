import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { DialogBox } from "../ui/dialogBox";

class AccessPcAction implements EventAction {
  type = "access_pc";
  done = false;

  private box!: DialogBox;

  start(ctx: EventContext): void {
    this.box = new DialogBox(ctx.scene, "The computer hums quietly...");
    this.box.start();
  }

  update(ctx: EventContext, dt: number): void {
    this.box.update(dt, ctx.interactPressed);
    if (this.box.isDone) this.done = true;
  }

  cleanup(): void {
    this.box.destroy();
  }
}

registerAction("access_pc", () => new AccessPcAction());
