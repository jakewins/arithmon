export interface MonsterDef {
  slug: string;
  name: string;
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  baseXpYield: number;
  catchRate: number;
  moveset: { slug: string; learnedAt: number }[];
  evolutions?: { species: string; level: number }[];
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
    baseXpYield: 50,
    catchRate: 255,
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
    baseXpYield: 45,
    catchRate: 255,
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
    baseXpYield: 55,
    catchRate: 255,
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
    baseXpYield: 60,
    catchRate: 255,
    moveset: [
      { slug: "growl", learnedAt: 1 },
      { slug: "bodySlam", learnedAt: 4 },
      { slug: "rockThrow", learnedAt: 7 },
    ],
  },
  memnomnom: {
    slug: "memnomnom",
    name: "Memnomnom",
    baseStats: {
      hp: 7,
      attack: 7,
      defense: 5,
      speed: 6,
    },
    baseXpYield: 50,
    catchRate: 255,
    moveset: [
      { slug: "bite", learnedAt: 1 },
      { slug: "scratch", learnedAt: 1 },
      { slug: "ram", learnedAt: 4 },
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
    baseXpYield: 50,
    catchRate: 255,
    moveset: [
      { slug: "ram", learnedAt: 1 },
      { slug: "waterGun", learnedAt: 3 },
      { slug: "bodySlam", learnedAt: 6 },
    ],
  },
  pairagrin: {
    slug: "pairagrin",
    name: "Pairagrin",
    baseStats: {
      hp: 7,
      attack: 6,
      defense: 5,
      speed: 7,
    },
    baseXpYield: 45,
    catchRate: 255,
    moveset: [
      { slug: "peck", learnedAt: 1 },
      { slug: "wingAttack", learnedAt: 4 },
      { slug: "ram", learnedAt: 7 },
    ],
  },
  aardorn: {
    slug: "aardorn",
    name: "Aardorn",
    baseStats: {
      hp: 8,
      attack: 6,
      defense: 7,
      speed: 5,
    },
    baseXpYield: 50,
    catchRate: 255,
    moveset: [
      { slug: "tackle", learnedAt: 1 },
      { slug: "hornAttack", learnedAt: 3 },
      { slug: "bodySlam", learnedAt: 6 },
    ],
  },
  cataspike: {
    slug: "cataspike",
    name: "Cataspike",
    baseStats: {
      hp: 6,
      attack: 7,
      defense: 6,
      speed: 6,
    },
    baseXpYield: 48,
    catchRate: 255,
    moveset: [
      { slug: "poisonSting", learnedAt: 1 },
      { slug: "scratch", learnedAt: 3 },
      { slug: "spikeLaunch", learnedAt: 6 },
    ],
  },
  cardiling: {
    slug: "cardiling",
    name: "Cardiling",
    baseStats: {
      hp: 6,
      attack: 7,
      defense: 5,
      speed: 8,
    },
    baseXpYield: 52,
    catchRate: 200,
    moveset: [
      { slug: "peck", learnedAt: 1 },
      { slug: "ember", learnedAt: 3 },
      { slug: "fireball", learnedAt: 7 },
    ],
  },
  eyenemy: {
    slug: "eyenemy",
    name: "Eyenemy",
    baseStats: {
      hp: 7,
      attack: 5,
      defense: 5,
      speed: 7,
    },
    baseXpYield: 50,
    catchRate: 200,
    moveset: [
      { slug: "glare", learnedAt: 1 },
      { slug: "bite", learnedAt: 3 },
      { slug: "psybeam", learnedAt: 6 },
    ],
  },
};
