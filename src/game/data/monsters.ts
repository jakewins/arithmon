export interface MonsterDef {
  slug: string;
  name: string;
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  moveset: { slug: string; learnedAt: number }[];
}

export const MONSTERS: Record<string, MonsterDef> = {
  rockitten: {
    slug: "rockitten",
    name: "Rockitten",
    baseStats: {
      hp: 8,
      attack: 6,
      defense: 6,
      speed: 6,
    },
    moveset: [{ slug: "ram", learnedAt: 1 }],
  },
};
