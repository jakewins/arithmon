import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { t } from "../../i18n";
import { formatText } from "../../textFormatter";
import { debugBridge } from "../../debug";
import { DialogBox } from "../ui/dialogBox";
import { getNpcSprite, type NpcSpeech } from "../../data/npcs";

/**
 * Upstream:
 *
 *   char_talk <character>,<field>[,location]
 *
 * Looks up the NPC's `speech.profile.default[field]` translation key and shows
 * it in a standard dialog box. We mirror upstream's `db/npc/*.yaml` shape via
 * the optional `speech` map on each NPC registry entry (`src/game/data/npcs.ts`).
 *
 * `location` overrides are accepted in the args list but not yet wired — none
 * of our currently-ported maps use them.
 */
class CharTalkAction implements EventAction {
  type = "char_talk";
  done = false;

  private npcSlug: string;
  private field: keyof NpcSpeech;
  private text = "";
  private box?: DialogBox;

  constructor(args: string[]) {
    this.npcSlug = args[0];
    this.field = (args[1] ?? "greeting") as keyof NpcSpeech;
  }

  start(ctx: EventContext): void {
    const def = getNpcSprite(this.npcSlug);
    const msgid = def.speech?.[this.field];
    if (!msgid) {
      console.warn(`char_talk: ${this.npcSlug} has no "${this.field}" line`);
      this.done = true;
      return;
    }
    this.text = formatText(t(msgid));
    this.box = new DialogBox(ctx.scene, this.text);
    this.box.start();
    debugBridge.emit("dialog_opened", { text: this.text });
  }

  update(ctx: EventContext, dt: number): void {
    if (!this.box) {
      this.done = true;
      return;
    }
    this.box.update(dt, ctx.interactPressed);
    if (this.box.isDone) this.done = true;
  }

  cleanup(): void {
    if (this.box) {
      this.box.destroy();
      debugBridge.emit("dialog_closed", {});
    }
  }
}

registerAction("char_talk", (args) => new CharTalkAction(args));
