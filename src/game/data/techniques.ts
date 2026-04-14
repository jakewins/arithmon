export interface TechniqueDef {
  slug: string;
  name: string;
  power: number;
  accuracy: number;
  range: "melee" | "ranged";
}

export const TECHNIQUES: Record<string, TechniqueDef> = {
  ram: {
    slug: "ram",
    name: "Ram",
    power: 1.5,
    accuracy: 0.85,
    range: "melee",
  },
};
