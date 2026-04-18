import type { ItemDef } from "./item";
import { ITEMS } from "../data/items";

export type Inventory = Map<string, number>;

export function createInventory(): Inventory {
  return new Map();
}

export function addItem(inventory: Inventory, slug: string, count = 1): void {
  const current = inventory.get(slug) ?? 0;
  inventory.set(slug, current + count);
}

export function removeItem(inventory: Inventory, slug: string, count = 1): boolean {
  const current = inventory.get(slug) ?? 0;
  if (current < count) return false;
  const remaining = current - count;
  if (remaining === 0) {
    inventory.delete(slug);
  } else {
    inventory.set(slug, remaining);
  }
  return true;
}

export function getItemCount(inventory: Inventory, slug: string): number {
  return inventory.get(slug) ?? 0;
}

export function getInventoryItems(inventory: Inventory): Array<{ item: ItemDef; count: number }> {
  const result: Array<{ item: ItemDef; count: number }> = [];
  for (const [slug, count] of inventory) {
    const item = ITEMS[slug];
    if (item) {
      result.push({ item, count });
    }
  }
  return result;
}
