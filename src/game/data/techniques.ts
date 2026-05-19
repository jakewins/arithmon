import type { ElementSlug } from "./elements";
import type { StatusSlug } from "./statuses";

export type TechniqueEffect =
  | { kind: "damage"; power: number }
  | { kind: "applyStatus"; status: StatusSlug; chance: number; target: "self" | "opponent" }
  | { kind: "heal"; amount: number; target: "self" };

export interface TechniqueDef {
  slug: string;
  name: string;
  /** Element type. Determines effectiveness multiplier vs. defender's types. */
  element: ElementSlug;
  range: "melee" | "ranged";
  accuracy: number;
  dpCost: number;
  /** Ordered list of effects executed on a successful hit. */
  effects: TechniqueEffect[];
}

export const TECHNIQUES: Record<string, TechniqueDef> = {
  ram: {
    slug: "ram",
    name: "Ram",
    element: "normal",
    range: "melee",
    accuracy: 0.85,
    dpCost: 2,
    effects: [{ kind: "damage", power: 1.5 }],
  },
  scratch: {
    slug: "scratch",
    name: "Scratch",
    element: "normal",
    range: "melee",
    accuracy: 0.95,
    dpCost: 1,
    effects: [{ kind: "damage", power: 1.0 }],
  },
  rockThrow: {
    slug: "rockThrow",
    name: "Rock Throw",
    element: "earth",
    range: "ranged",
    accuracy: 0.75,
    dpCost: 3,
    effects: [{ kind: "damage", power: 2.0 }],
  },
  pounce: {
    slug: "pounce",
    name: "Pounce",
    element: "normal",
    range: "melee",
    accuracy: 0.8,
    dpCost: 3,
    effects: [{ kind: "damage", power: 1.8 }],
  },
  growl: {
    slug: "growl",
    name: "Growl",
    element: "normal",
    range: "ranged",
    accuracy: 1.0,
    dpCost: 1,
    effects: [{ kind: "damage", power: 0.5 }],
  },
  bite: {
    slug: "bite",
    name: "Bite",
    element: "normal",
    range: "melee",
    accuracy: 0.9,
    dpCost: 1,
    effects: [{ kind: "damage", power: 1.2 }],
  },
  ember: {
    slug: "ember",
    name: "Ember",
    element: "fire",
    range: "ranged",
    accuracy: 0.9,
    dpCost: 2,
    effects: [
      { kind: "damage", power: 1.4 },
      // Ember has a small chance to burn — matches upstream behavior.
      { kind: "applyStatus", status: "burn", chance: 0.1, target: "opponent" },
    ],
  },
  fireball: {
    slug: "fireball",
    name: "Fireball",
    element: "fire",
    range: "ranged",
    accuracy: 0.7,
    dpCost: 3,
    effects: [{ kind: "damage", power: 2.2 }],
  },
  waterGun: {
    slug: "waterGun",
    name: "Water Gun",
    element: "water",
    range: "ranged",
    accuracy: 0.9,
    dpCost: 2,
    effects: [{ kind: "damage", power: 1.3 }],
  },
  bodySlam: {
    slug: "bodySlam",
    name: "Body Slam",
    element: "normal",
    range: "melee",
    accuracy: 0.85,
    dpCost: 2,
    effects: [{ kind: "damage", power: 1.6 }],
  },
  vineWhip: {
    slug: "vineWhip",
    name: "Vine Whip",
    element: "wood",
    range: "melee",
    accuracy: 0.9,
    dpCost: 2,
    effects: [{ kind: "damage", power: 1.3 }],
  },
  leafStorm: {
    slug: "leafStorm",
    name: "Leaf Storm",
    element: "wood",
    range: "ranged",
    accuracy: 0.75,
    dpCost: 3,
    effects: [{ kind: "damage", power: 2.0 }],
  },
  peck: {
    slug: "peck",
    name: "Peck",
    element: "sky",
    range: "melee",
    accuracy: 0.95,
    dpCost: 1,
    effects: [{ kind: "damage", power: 1.1 }],
  },
  wingAttack: {
    slug: "wingAttack",
    name: "Wing Attack",
    element: "sky",
    range: "melee",
    accuracy: 0.85,
    dpCost: 2,
    effects: [{ kind: "damage", power: 1.6 }],
  },
  tackle: {
    slug: "tackle",
    name: "Tackle",
    element: "normal",
    range: "melee",
    accuracy: 0.95,
    dpCost: 1,
    effects: [{ kind: "damage", power: 1.0 }],
  },
  hornAttack: {
    slug: "hornAttack",
    name: "Horn Attack",
    element: "normal",
    range: "melee",
    accuracy: 0.85,
    dpCost: 2,
    effects: [{ kind: "damage", power: 1.4 }],
  },
  poisonSting: {
    slug: "poisonSting",
    name: "Poison Sting",
    element: "venom",
    range: "ranged",
    accuracy: 0.9,
    dpCost: 1,
    effects: [
      { kind: "damage", power: 1.0 },
      { kind: "applyStatus", status: "poisoned", chance: 0.3, target: "opponent" },
    ],
  },
  spikeLaunch: {
    slug: "spikeLaunch",
    name: "Spike Launch",
    element: "metal",
    range: "ranged",
    accuracy: 0.8,
    dpCost: 3,
    effects: [{ kind: "damage", power: 1.8 }],
  },
  glare: {
    slug: "glare",
    name: "Glare",
    element: "normal",
    range: "ranged",
    accuracy: 1.0,
    dpCost: 1,
    effects: [{ kind: "damage", power: 0.8 }],
  },
  psybeam: {
    slug: "psybeam",
    name: "Psybeam",
    element: "cosmic",
    range: "ranged",
    accuracy: 0.85,
    dpCost: 3,
    effects: [{ kind: "damage", power: 1.8 }],
  },
  lullaby: {
    slug: "lullaby",
    name: "Lullaby",
    element: "cosmic",
    range: "ranged",
    accuracy: 0.85,
    dpCost: 2,
    effects: [{ kind: "applyStatus", status: "sleep", chance: 0.8, target: "opponent" }],
  },
};
