import type { ItemDef } from "./item";
import type { Monster } from "../model/Monster";

export function canUseItem(
  item: ItemDef,
  target: Monster,
  context: "combat" | "overworld",
): boolean {
  if (!item.usableIn.includes(context)) return false;

  for (const effect of item.effects) {
    switch (effect.type) {
      case "heal_hp":
      case "heal_hp_percent":
        // Can't heal a fainted or full-HP monster
        if (target.fainted || target.currentHp >= target.maxHp) return false;
        break;
      case "revive":
        // Can only revive a fainted monster
        if (!target.fainted) return false;
        break;
      case "capture":
        // Capture devices only work in combat (already checked above)
        // and only on opponent monsters — caller must ensure target is wild.
        // From validation perspective, just ensure context is combat.
        break;
    }
  }

  return true;
}
