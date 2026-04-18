import type { ItemDef } from "../item/item";

export const ITEMS: Record<string, ItemDef> = {
  potion: {
    slug: "potion",
    name: "Potion",
    description: "Heals 20 HP.",
    category: "potion",
    sprite: "item/potion",
    usableIn: ["combat", "overworld"],
    effects: [{ type: "heal_hp", amount: 20 }],
  },
  super_potion: {
    slug: "super_potion",
    name: "Super Potion",
    description: "Heals 60 HP.",
    category: "potion",
    sprite: "item/super_potion",
    usableIn: ["combat", "overworld"],
    effects: [{ type: "heal_hp", amount: 60 }],
  },
  tuxeball: {
    slug: "tuxeball",
    name: "Tuxeball",
    description: "A basic capture device for catching wild monsters.",
    category: "capture",
    sprite: "item/tuxeball",
    usableIn: ["combat"],
    effects: [{ type: "capture", modifier: 1.0 }],
  },
  revive: {
    slug: "revive",
    name: "Revive",
    description: "Revives a fainted monster to 50% HP.",
    category: "potion",
    sprite: "item/revive",
    usableIn: ["combat", "overworld"],
    effects: [{ type: "revive", hp_percent: 50 }],
  },
};
