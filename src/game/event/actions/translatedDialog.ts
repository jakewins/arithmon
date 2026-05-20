import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { t } from "../../i18n";
import { formatText } from "../../textFormatter";
import { debugBridge } from "../../debug";
import { DialogBox } from "../ui/dialogBox";

class TranslatedDialogAction implements EventAction {
  type = "translated_dialog";
  done = false;

  private key: string;
  private text = "";
  private box!: DialogBox;

  constructor(args: string[]) {
    this.key = args[0];
  }

  start(ctx: EventContext): void {
    this.text = formatText(t(this.key));
    this.box = new DialogBox(ctx.scene, this.text);
    this.box.start();
    debugBridge.emit("dialog_opened", { text: this.text });
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

registerAction("translated_dialog", (args) => new TranslatedDialogAction(args));
