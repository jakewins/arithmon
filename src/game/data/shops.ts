export interface ShopInventory {
  items: { slug: string; price: number }[];
  sellMultiplier: number;
}

const SHOP_REGISTRY: Record<string, ShopInventory> = {
  spyder_cotton_scoop: {
    items: [
      { slug: "potion", price: 50 },
      { slug: "tuxeball", price: 100 },
      { slug: "revive", price: 100 },
    ],
    sellMultiplier: 0.5,
  },
};

export function getShop(slug: string): ShopInventory | undefined {
  return SHOP_REGISTRY[slug];
}
