export interface ShopInventory {
  items: { slug: string; price: number }[];
  sellMultiplier: number;
}

// Prices and inventories are verbatim from upstream's `db/economy/*.yaml`
// files in `mods/tuxemon`. `sellMultiplier` matches upstream's
// `resale_multiplier`. Per-shop per-item inventory caps (upstream `inventory`
// key) are not yet modeled — see follow-up STORY-0228.
const SHOP_REGISTRY: Record<string, ShopInventory> = {
  spyder_cotton_scoop: {
    items: [
      { slug: "potion", price: 20 },
      { slug: "revive", price: 100 },
      { slug: "tuxeball", price: 50 },
    ],
    sellMultiplier: 0.5,
  },
  // Cotton Town's tech shop (run by the `spyder_wayfarer1_norm` NPC). Stocks
  // evolution morph items and TMs. The morph/TM `effects` are stubbed in
  // items.ts until STORY-0226/STORY-0227 wire them up.
  spyder_cotton_tech: {
    items: [
      { slug: "miaow_milk", price: 2000 },
      { slug: "pyramidion", price: 2000 },
      { slug: "ox_stick", price: 2000 },
      { slug: "tm_avalanche", price: 2000 },
      { slug: "tm_blossom", price: 1000 },
    ],
    sellMultiplier: 0.5,
  },
  spyder_paper_scoop: {
    items: [
      { slug: "potion", price: 20 },
      { slug: "tuxeball", price: 50 },
      { slug: "revive", price: 100 },
    ],
    sellMultiplier: 0.5,
  },
};

export function getShop(slug: string): ShopInventory | undefined {
  return SHOP_REGISTRY[slug];
}
