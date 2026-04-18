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
    moveset: [
      { slug: "scratch", learnedAt: 1 },
      { slug: "ram", learnedAt: 3 },
      { slug: "pounce", learnedAt: 6 },
    ],
  },
  budaye: {
    slug: "budaye",
    name: "Budaye",
    baseStats: {
      hp: 7,
      attack: 5,
      defense: 7,
      speed: 5,
    },
    moveset: [
      { slug: "scratch", learnedAt: 1 },
      { slug: "vineWhip", learnedAt: 3 },
      { slug: "leafStorm", learnedAt: 7 },
    ],
  },
  ignibus: {
    slug: "ignibus",
    name: "Ignibus",
    baseStats: {
      hp: 6,
      attack: 8,
      defense: 5,
      speed: 7,
    },
    moveset: [
      { slug: "bite", learnedAt: 1 },
      { slug: "ember", learnedAt: 3 },
      { slug: "fireball", learnedAt: 6 },
    ],
  },
  grintot: {
    slug: "grintot",
    name: "Grintot",
    baseStats: {
      hp: 9,
      attack: 5,
      defense: 8,
      speed: 4,
    },
    moveset: [
      { slug: "growl", learnedAt: 1 },
      { slug: "bodySlam", learnedAt: 4 },
      { slug: "rockThrow", learnedAt: 7 },
    ],
  },
  dollfin: {
    slug: "dollfin",
    name: "Dollfin",
    baseStats: {
      hp: 7,
      attack: 6,
      defense: 6,
      speed: 7,
    },
    moveset: [
      { slug: "ram", learnedAt: 1 },
      { slug: "waterGun", learnedAt: 3 },
      { slug: "bodySlam", learnedAt: 6 },
    ],
  },
};
