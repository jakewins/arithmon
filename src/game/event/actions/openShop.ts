import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { getShop } from "../../data/shops";

/**
 * Tuxemon syntax:
 *   open_shop <economy_slug>
 *
 * Opens the shop UI with the given economy/shop inventory.
 * Multi-frame action: stays `done: false` until ShopScene shuts down.
 */
class OpenShopAction implements EventAction {
  type = "open_shop";
  done = false;

  private shopSlug: string;

  constructor(args: string[]) {
    this.shopSlug = args[0] ?? "";
  }

  start(ctx: EventContext): void {
    const shop = getShop(this.shopSlug);
    if (!shop) {
      console.warn(`open_shop: no shop found for "${this.shopSlug}"`);
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
