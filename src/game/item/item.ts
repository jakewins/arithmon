export type ItemCategory = "potion" | "capture" | "technique" | "food" | "other";

export type ItemEffect =
  | { type: "heal_hp"; amount: number }
  | { type: "heal_hp_percent"; percent: number }
  | { type: "capture"; modifier: number }
  | { type: "revive"; hp_percent: number };

export interface ItemDef {
  slug: string;
  name: string;
  description: string;
  category: ItemCategory;
  sprite: string;
  usableIn: ("combat" | "overworld")[];
  effects: ItemEffect[];
}
