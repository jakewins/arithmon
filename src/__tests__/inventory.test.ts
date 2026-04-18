import { describe, it, expect } from "vitest";
import {
  createInventory,
  addItem,
  removeItem,
  getItemCount,
  getInventoryItems,
} from "../game/item/inventory";

describe("inventory helpers", () => {
  it("starts empty", () => {
    const inv = createInventory();
    expect(getItemCount(inv, "potion")).toBe(0);
    expect(getInventoryItems(inv)).toEqual([]);
  });

  it("adds items and increases count", () => {
    const inv = createInventory();
    addItem(inv, "potion", 3);
    expect(getItemCount(inv, "potion")).toBe(3);

    addItem(inv, "potion", 2);
    expect(getItemCount(inv, "potion")).toBe(5);
  });

  it("adds 1 by default", () => {
    const inv = createInventory();
    addItem(inv, "potion");
    expect(getItemCount(inv, "potion")).toBe(1);
  });

  it("removes items and decreases count", () => {
    const inv = createInventory();
    addItem(inv, "potion", 5);

    expect(removeItem(inv, "potion", 2)).toBe(true);
    expect(getItemCount(inv, "potion")).toBe(3);
  });

  it("removes the entry when count reaches zero", () => {
    const inv = createInventory();
    addItem(inv, "potion", 2);

    expect(removeItem(inv, "potion", 2)).toBe(true);
    expect(getItemCount(inv, "potion")).toBe(0);
    expect(getInventoryItems(inv)).toEqual([]);
  });

  it("returns false when removing more than available", () => {
    const inv = createInventory();
    addItem(inv, "potion", 1);

    expect(removeItem(inv, "potion", 2)).toBe(false);
    expect(getItemCount(inv, "potion")).toBe(1);
  });

  it("returns false when removing from empty inventory", () => {
    const inv = createInventory();
    expect(removeItem(inv, "potion")).toBe(false);
  });

  it("getInventoryItems returns items with definitions", () => {
    const inv = createInventory();
    addItem(inv, "potion", 3);
    addItem(inv, "tuxeball", 5);

    const items = getInventoryItems(inv);
    expect(items).toHaveLength(2);

    const potion = items.find((i) => i.item.slug === "potion");
    expect(potion).toBeDefined();
    expect(potion!.count).toBe(3);
    expect(potion!.item.name).toBe("Potion");

    const tuxeball = items.find((i) => i.item.slug === "tuxeball");
    expect(tuxeball).toBeDefined();
    expect(tuxeball!.count).toBe(5);
  });

  it("getInventoryItems skips unknown slugs", () => {
    const inv = createInventory();
    addItem(inv, "nonexistent", 1);

    expect(getInventoryItems(inv)).toEqual([]);
  });
});
