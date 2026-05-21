import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { getShop } from "../../data/shops";

/**
 * Tuxemon syntax:
 *   open_shop <economy_slug>            (our legacy back-compat form)
 *   open_shop <npc_slug>,<menu_flag>    (upstream form; e.g.
 *                                        `open_shop spyder_shopkeeper,both_item`)
 *
 * Upstream pairs `set_economy <npc>,<economy>` (which stores
 * `economy_<npc> -> economy_slug` in the variable map) with a later
 * `open_shop <npc>,both_item` interact event. We mirror that: if a second
 * positional arg is present, treat the first as an NPC slug and look up the
 * economy from variables. With no second arg, treat the first as the economy
 * slug directly.
 *
 * The `both_item` flag in upstream toggles whether the shop also sells
 * monsters (a vendor-of-monsters concept we don't support yet). All current
 * cotton/paper economies have `monsters: []` anyway, so the flag is accepted
 * and ignored. Tracked as a known stub for follow-up.
 *
 * Multi-frame action: stays `done: false` until ShopScene shuts down.
 */
class OpenShopAction implements EventAction {
  type = "open_shop";
  done = false;

  private firstArg: string;
  private hasSecondArg: boolean;

  constructor(args: string[]) {
    this.firstArg = args[0] ?? "";
    this.hasSecondArg = args.length > 1 && args[1] !== "";
  }

  start(ctx: EventContext): void {
    const shopSlug = this.hasSecondArg
      ? (ctx.variables.get(`economy_${this.firstArg}`) ?? "")
      : this.firstArg;
    const shop = shopSlug ? getShop(shopSlug) : undefined;
    if (!shop) {
      console.warn(
        `open_shop: no shop found for "${shopSlug}" (arg="${this.firstArg}", upstream-form=${this.hasSecondArg})`,
      );
      this.done = true;
      return;
    }

    ctx.controls.locked = true;
    ctx.scene.scene.pause();
    ctx.scene.scene.launch("ShopScene", {
      shop,
      callerScene: ctx.scene.scene.key,
    });

    ctx.scene.scene.get("ShopScene").events.once("shutdown", () => {
      ctx.controls.locked = false;
      this.done = true;
    });
  }

  update(): void {
    // Waits for shutdown listener
  }

  cleanup(): void {
    // nothing to clean up
  }
}

registerAction("open_shop", (args) => new OpenShopAction(args));
