import { describe, it, expect } from "vitest";
import { canUseItem } from "../game/item/validation";
import { ITEMS } from "../game/data/items";
import { Monster } from "../game/model/Monster";

describe("canUseItem", () => {
  describe("potions", () => {
    it("can use potion on a damaged monster in combat", () => {
      const m = Monster.spawn("rockitten", 5);
      m.currentHp = m.maxHp - 10;
      expect(canUseItem(ITEMS.potion, m, "combat")).toBe(true);
    });

    it("can use potion on a damaged monster in overworld", () => {
      const m = Monster.spawn("rockitten", 5);
      m.currentHp = m.maxHp - 10;
      expect(canUseItem(ITEMS.potion, m, "overworld")).toBe(true);
    });

    it("cannot use potion on a full-HP monster", () => {
      const m = Monster.spawn("rockitten", 5);
      expect(canUseItem(ITEMS.potion, m, "combat")).toBe(false);
    });

    it("cannot use potion on a fainted monster", () => {
      const m = Monster.spawn("rockitten", 5);
      m.currentHp = 0;
      expect(canUseItem(ITEMS.potion, m, "combat")).toBe(false);
    });
  });

  describe("revive", () => {
    it("can use revive on a fainted monster", () => {
      const m = Monster.spawn("rockitten", 5);
      m.currentHp = 0;
      expect(canUseItem(ITEMS.revive, m, "combat")).toBe(true);
    });

    it("cannot use revive on a healthy monster", () => {
      const m = Monster.spawn("rockitten", 5);
      expect(canUseItem(ITEMS.revive, m, "combat")).toBe(false);
    });

    it("can use revive in overworld", () => {
      const m = Monster.spawn("rockitten", 5);
      m.currentHp = 0;
      expect(canUseItem(ITEMS.revive, m, "overworld")).toBe(true);
    });
  });

  describe("capture devices", () => {
    it("can use tuxeball in combat", () => {
      const m = Monster.spawn("rockitten", 5);
      expect(canUseItem(ITEMS.tuxeball, m, "combat")).toBe(true);
    });

    it("cannot use tuxeball in overworld", () => {
      const m = Monster.spawn("rockitten", 5);
      expect(canUseItem(ITEMS.tuxeball, m, "overworld")).toBe(false);
    });
  });
});
