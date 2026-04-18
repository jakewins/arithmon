import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { debugBridge } from "../../debug";
import { DialogBox } from "../ui/dialogBox";

class DialogAction implements EventAction {
  type = "dialog";
  done = false;

  private text: string;
  private box!: DialogBox;

  constructor(args: string[]) {
    this.text = args.join(" ");
  }

  start(ctx: EventContext): void {
    // Substitute ${{var}} with game variable values and $player with player name
    const resolved = this.text
      .replace(/\$player/g, ctx.session.player.name)
      .replace(/\$\{\{(\w+)\}\}/g, (_m, key) => ctx.variables.get(key) ?? key);
    this.box = new DialogBox(ctx.scene, resolved);
    this.box.start();
    debugBridge.emit("dialog_opened", { text: resolved });
  }

  update(ctx: EventContext, dt: number): void {
    this.box.update(dt, ctx.interactPressed);
    if (this.box.isDone) this.done = true;
  }

  cleanup(): void {
    this.box.destroy();
    debugBridge.emit("dialog_closed", {});
  }
}

registerAction("dialog", (args) => new DialogAction(args));
