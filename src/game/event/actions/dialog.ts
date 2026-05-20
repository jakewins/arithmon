import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { debugBridge } from "../../debug";
import { DialogBox } from "../ui/dialogBox";
import { formatText } from "../../textFormatter";

class DialogAction implements EventAction {
  type = "dialog";
  done = false;

  private text: string;
  private box!: DialogBox;

  constructor(args: string[]) {
    this.text = args.join(" ");
  }

  start(ctx: EventContext): void {
    // Route through the shared formatter so `${{name}}`, `${{var:foo}}`, and
    // every other placeholder behave identically to the translated_dialog
    // path. The pre-formatter ad-hoc `$player` + `${{var}}` substitution is
    // gone — no event currently uses either spelling, and the new spelling
    // for game variables is `${{var:<key>}}`.
    const resolved = formatText(this.text);
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
