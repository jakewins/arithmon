export interface TechniqueDef {
  slug: string;
  name: string;
  power: number;
  accuracy: number;
  range: "melee" | "ranged";
  dpCost: number;
}

export const TECHNIQUES: Record<string, TechniqueDef> = {
  ram: {
    slug: "ram",
    name: "Ram",
    power: 1.5,
    accuracy: 0.85,
    range: "melee",
    dpCost: 2,
  },
  scratch: {
    slug: "scratch",
    name: "Scratch",
    power: 1.0,
    accuracy: 0.95,
    range: "melee",
    dpCost: 1,
  },
  rockThrow: {
    slug: "rockThrow",
    name: "Rock Throw",
    power: 2.0,
    accuracy: 0.75,
    range: "ranged",
    dpCost: 3,
  },
  pounce: {
    slug: "pounce",
    name: "Pounce",
    power: 1.8,
    accuracy: 0.8,
    range: "melee",
    dpCost: 3,
  },
  growl: {
    slug: "growl",
    name: "Growl",
    power: 0.5,
    accuracy: 1.0,
    range: "ranged",
    dpCost: 1,
  },
};
