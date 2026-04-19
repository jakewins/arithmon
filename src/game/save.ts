import { session, type CombatOutcome } from "./session";
import { Monster } from "./model/Monster";
import { createInventory, addItem } from "./item/inventory";
import { createMonsterRegistry, markSeen, markCaught } from "./model/monsterRegistry";
import { TECHNIQUES } from "./data/techniques";

const SAVE_KEY = "arithmon_save";

interface SavedMonster {
  slug: string;
  level: number;
  totalXp: number;
  currentHp: number;
  /** Technique slugs the player has equipped (may differ from default moveset). */
  techniques: string[];
}

interface SavedLocation {
  mapKey: string;
  tileX: number;
  tileY: number;
  facing: string;
}

interface SaveData {
  version: 1;
  player: {
    name: string;
    gender: string | null;
    template: string;
    money: number;
    monsters: SavedMonster[];
    inventory: Record<string, number>;
    variables: Record<string, string>;
  };
  location: SavedLocation;
  faintTeleport?: { mapKey: string; tileX: number; tileY: number };
  skillStates: Record<string, { box: number; lastSeen: number }>;
  skillEncounter: number;
  monsterStorage: SavedMonster[];
  monsterRegistry: { seen: string[]; caught: string[] };
  battleOutcomes: Record<string, CombatOutcome>;
}

function serializeMonster(m: Monster): SavedMonster {
  return {
    slug: m.slug,
    level: m.level,
    totalXp: m.totalXp,
    currentHp: m.currentHp,
    techniques: m.techniques.map((t) => t.slug),
  };
}

function deserializeMonster(s: SavedMonster): Monster {
  const m = Monster.spawn(s.slug, s.level);
  // Restore XP (may trigger level-ups if save was mid-level)
  const xpDiff = s.totalXp - m.totalXp;
  if (xpDiff > 0) m.addXp(xpDiff);
  m.currentHp = Math.min(s.currentHp, m.maxHp);
  // Restore specific technique loadout
  if (s.techniques.length > 0) {
    const techs = s.techniques.map((slug) => TECHNIQUES[slug]).filter((t) => t != null);
    if (techs.length > 0) m.techniques = techs;
  }
  return m;
}

/** Current player location, updated by OverworldScene. */
let currentLocation: SavedLocation = { mapKey: "starter", tileX: 10, tileY: 7, facing: "down" };

/** Called by OverworldScene on init/teleport to track current position. */
export function updateSaveLocation(mapKey: string, tileX: number, tileY: number, facing: string) {
  currentLocation = { mapKey, tileX, tileY, facing };
}

/** Pending saved location for the first OverworldScene.init call. */
let pendingSavedLocation: SavedLocation | null = null;

/**
 * Return the saved location once (for initial spawn), then clear it.
 * Subsequent calls (from teleports) return null.
 */
export function consumeSavedLocation(): SavedLocation | null {
  const loc = pendingSavedLocation;
  pendingSavedLocation = null;
  return loc;
}

/** Serialize session to JSON and write to localStorage. */
export function saveGame(): void {
  const p = session.player;
  const data: SaveData = {
    version: 1,
    player: {
      name: p.name,
      gender: p.gender,
      template: p.template,
      money: p.money,
      monsters: p.monsters.map(serializeMonster),
      inventory: Object.fromEntries(p.inventory),
      variables: p.gameVariables.toRecord(),
    },
    location: currentLocation,
    faintTeleport: session.faintTeleport,
    skillStates: session.skillStates,
    skillEncounter: session.skillEncounter,
    monsterStorage: session.monsterStorage.map(serializeMonster),
    monsterRegistry: {
      seen: [...session.monsterRegistry.seen],
      caught: [...session.monsterRegistry.caught],
    },
    battleOutcomes: Object.fromEntries(session.battleOutcomes),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded)
  }
}

/** Check if a save exists in localStorage. */
export function hasSave(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Load save from localStorage into the session.
 * Returns the saved location so OverworldScene can spawn there,
 * or null if no save exists.
 */
export function loadGame(): SavedLocation | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let data: SaveData;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (data.version !== 1) return null;

  // Restore player state
  const p = session.player;
  p.name = data.player.name;
  p.gender = data.player.gender;
  p.template = data.player.template;
  p.money = data.player.money;

  // Monsters
  p.monsters = data.player.monsters.map(deserializeMonster);

  // Inventory
  p.inventory = createInventory();
  for (const [slug, count] of Object.entries(data.player.inventory)) {
    addItem(p.inventory, slug, count);
  }

  // Game variables
  for (const [key, value] of Object.entries(data.player.variables)) {
    p.gameVariables.set(key, value);
  }

  // Location
  currentLocation = data.location;

  // Faint teleport
  session.faintTeleport = data.faintTeleport;

  // Skill states
  session.skillStates = data.skillStates;
  session.skillEncounter = data.skillEncounter;

  // Monster storage
  session.monsterStorage = data.monsterStorage.map(deserializeMonster);

  // Monster registry
  const reg = createMonsterRegistry();
  for (const slug of data.monsterRegistry.seen) markSeen(reg, slug);
  for (const slug of data.monsterRegistry.caught) markCaught(reg, slug);
  (session as { monsterRegistry: typeof reg }).monsterRegistry = reg;

  // Battle outcomes
  session.battleOutcomes = new Map(
    Object.entries(data.battleOutcomes) as [string, CombatOutcome][],
  );

  pendingSavedLocation = data.location;
  return data.location;
}
