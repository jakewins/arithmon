import { MONSTERS } from "../data/monsters";
import { TECHNIQUES, TechniqueDef } from "../data/techniques";

export class Monster {
  readonly slug: string;
  readonly name: string;
  readonly level: number;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
  readonly techniques: TechniqueDef[];
  currentHp: number;

  private constructor(
    slug: string,
    name: string,
    level: number,
    maxHp: number,
    attack: number,
    defense: number,
    speed: number,
    techniques: TechniqueDef[],
  ) {
    this.slug = slug;
    this.name = name;
    this.level = level;
    this.maxHp = maxHp;
    this.attack = attack;
    this.defense = defense;
    this.speed = speed;
    this.techniques = techniques;
    this.currentHp = maxHp;
  }

  static spawn(slug: string, level: number): Monster {
    const def = MONSTERS[slug];
    if (!def) throw new Error(`Unknown monster: ${slug}`);

    const stat = (base: number) => base * (level + 7);

    const techniques = def.moveset
      .filter((m) => m.learnedAt <= level)
      .map((m) => {
        const tech = TECHNIQUES[m.slug];
        if (!tech) throw new Error(`Unknown technique: ${m.slug}`);
        return tech;
      });

    return new Monster(
      def.slug,
      def.name,
      level,
      stat(def.baseStats.hp),
      stat(def.baseStats.attack),
      stat(def.baseStats.defense),
      stat(def.baseStats.speed),
      techniques,
    );
  }
}
