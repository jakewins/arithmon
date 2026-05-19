import { MONSTERS } from "../data/monsters";
import { TECHNIQUES, TechniqueDef } from "../data/techniques";
import { xpForLevel } from "../combat/formula";

let nextMonsterId = 1;

export const MAX_TECHNIQUES = 4;

export interface MonsterStatsSnapshot {
  maxHp: number;
  melee: number;
  ranged: number;
  armor: number;
  dodge: number;
  speed: number;
}

export interface LevelUpResult {
  newLevel: number;
  oldStats: MonsterStatsSnapshot;
  newStats: MonsterStatsSnapshot;
  newMoves: TechniqueDef[];
}

export class Monster {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  level: number;
  maxHp: number;
  melee: number;
  ranged: number;
  armor: number;
  dodge: number;
  speed: number;
  techniques: TechniqueDef[];
  totalXp: number;
  currentHp: number;
  status: string[] = [];
  bond = 0;

  private constructor(
    slug: string,
    name: string,
    level: number,
    stats: MonsterStatsSnapshot,
    techniques: TechniqueDef[],
    totalXp: number,
  ) {
    this.id = `mon-${nextMonsterId++}`;
    this.slug = slug;
    this.name = name;
    this.level = level;
    this.maxHp = stats.maxHp;
    this.melee = stats.melee;
    this.ranged = stats.ranged;
    this.armor = stats.armor;
    this.dodge = stats.dodge;
    this.speed = stats.speed;
    this.techniques = techniques;
    this.totalXp = totalXp;
    this.currentHp = stats.maxHp;
  }

  static spawn(slug: string, level: number): Monster {
    const def = MONSTERS[slug];
    if (!def) throw new Error(`Unknown monster: ${slug}`);

    const scale = (base: number) => base * (level + 7);
    const stats: MonsterStatsSnapshot = {
      maxHp: scale(def.baseStats.hp),
      melee: scale(def.baseStats.melee),
      ranged: scale(def.baseStats.ranged),
      armor: scale(def.baseStats.armor),
      dodge: scale(def.baseStats.dodge),
      speed: scale(def.baseStats.speed),
    };

    const techniques = def.moveset
      .filter((m) => m.learnedAt <= level)
      .map((m) => {
        const tech = TECHNIQUES[m.slug];
        if (!tech) throw new Error(`Unknown technique: ${m.slug}`);
        return tech;
      });

    return new Monster(def.slug, def.name, level, stats, techniques, xpForLevel(level));
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

  private snapshot(): MonsterStatsSnapshot {
    return {
      maxHp: this.maxHp,
      melee: this.melee,
      ranged: this.ranged,
      armor: this.armor,
      dodge: this.dodge,
      speed: this.speed,
    };
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
    const oldStats = this.snapshot();

    this.level++;
    const scale = (base: number) => base * (this.level + 7);
    this.maxHp = scale(def.baseStats.hp);
    this.melee = scale(def.baseStats.melee);
    this.ranged = scale(def.baseStats.ranged);
    this.armor = scale(def.baseStats.armor);
    this.dodge = scale(def.baseStats.dodge);
    this.speed = scale(def.baseStats.speed);

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
      newStats: this.snapshot(),
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
