/**
 * NPC trainer party definitions — maps NPC slugs to monster parties.
 * Only NPCs who participate in trainer battles need entries here.
 */
export interface NpcPartyEntry {
  slug: string;
  level: number;
}

export interface NpcPartyDef {
  /** Display name shown in battle intro/victory messages. */
  name: string;
  monsters: NpcPartyEntry[];
  /** Gold awarded to the player on victory. */
  goldReward: number;
}

const NPC_PARTIES: Record<string, NpcPartyDef> = {
  spyder_papertown_silver: {
    name: "Silver",
    monsters: [
      { slug: "rockitten", level: 5 },
      { slug: "budaye", level: 4 },
    ],
    goldReward: 200,
  },
  spyder_route1_bjorn: {
    name: "Bjorn",
    monsters: [{ slug: "aardorn", level: 3 }],
    goldReward: 100,
  },
};

export function getNpcParty(npcSlug: string): NpcPartyDef | undefined {
  return NPC_PARTIES[npcSlug];
}
