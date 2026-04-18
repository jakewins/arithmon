import { MONSTERS } from "../data/monsters";
import { TECHNIQUES, TechniqueDef } from "../data/techniques";
import { xpForLevel } from "../combat/formula";

let nextMonsterId = 1;

export const MAX_TECHNIQUES = 4;

export interface LevelUpResult {
  newLevel: number;
  oldStats: { maxHp: number; attack: number; defense: number; speed: number };
  newStats: { maxHp: number; attack: number; defense: number; speed: number };
  newMoves: TechniqueDef[];
}

export class Monster {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  level: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  techniques: TechniqueDef[];
  totalXp: number;
  currentHp: number;
  status: string[] = [];

  private constructor(
    slug: string,
    name: string,
    level: number,
    maxHp: number,
    attack: number,
    defense: number,
    speed: number,
    techniques: TechniqueDef[],
    totalXp: number,
  ) {
    this.id = `mon-${nextMonsterId++}`;
    this.slug = slug;
    this.name = name;
    this.level = level;
    this.maxHp = maxHp;
    this.attack = attack;
    this.defense = defense;
    this.speed = speed;
    this.techniques = techniques;
    this.totalXp = totalXp;
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
      xpForLevel(level),
    );
  }

  get fainted(): boolean {
    return this.currentHp <= 0;
  }

  /** XP needed to reach the next level. */
  get xpToNextLevel(): number {
    return xpForLevel(this.level + 1);
  }

  /** Progress toward next level as a fraction 0.0–1.0. */
  get xpProgress(): number {
    const currentLevelXp = xpForLevel(this.level);
    const nextLevelXp = xpForLevel(this.level + 1);
    const range = nextLevelXp - currentLevelXp;
    if (range <= 0) return 1;
    return Math.min(1, (this.totalXp - currentLevelXp) / range);
  }

  /**
   * Add XP and process any level-ups. Returns an array of level-up results
   * (empty if no level-ups occurred).
   */
  addXp(amount: number): LevelUpResult[] {
    this.totalXp += amount;
    const results: LevelUpResult[] = [];

    while (this.totalXp >= xpForLevel(this.level + 1)) {
      results.push(this.levelUp());
    }

    return results;
  }

  private levelUp(): LevelUpResult {
    const def = MONSTERS[this.slug];
    const oldStats = {
      maxHp: this.maxHp,
      attack: this.attack,
      defense: this.defense,
      speed: this.speed,
    };

    this.level++;
    const stat = (base: number) => base * (this.level + 7);
    this.maxHp = stat(def.baseStats.hp);
    this.attack = stat(def.baseStats.attack);
    this.defense = stat(def.baseStats.defense);
    this.speed = stat(def.baseStats.speed);

    // Heal the HP difference
    const hpGain = this.maxHp - oldStats.maxHp;
    this.currentHp += hpGain;

    // Learn new moves at this level
    const newMoves: TechniqueDef[] = [];
    for (const entry of def.moveset) {
      if (entry.learnedAt === this.level) {
        const tech = TECHNIQUES[entry.slug];
        if (tech && !this.techniques.some((t) => t.slug === tech.slug)) {
          if (this.techniques.length < MAX_TECHNIQUES) {
            this.techniques.push(tech);
            newMoves.push(tech);
          }
        }
      }
    }

    return {
      newLevel: this.level,
      oldStats,
      newStats: {
        maxHp: this.maxHp,
        attack: this.attack,
        defense: this.defense,
        speed: this.speed,
      },
      newMoves,
    };
  }

  /**
   * Replace a technique at the given index with a new one.
   * Used when the monster already knows MAX_TECHNIQUES moves and learns a new one.
   */
  replaceTechnique(index: number, newTech: TechniqueDef): void {
    if (index < 0 || index >= this.techniques.length) return;
    this.techniques[index] = newTech;
  }
}

export const PARTY_LIMIT = 6;

/** Returns the first non-fainted monster in the party, or null if all fainted. */
export function getLeadMonster(party: Monster[]): Monster | null {
  return party.find((m) => !m.fainted) ?? null;
}
