export interface NpcSpriteDef {
  spritesheet: string;
}

const NPC_REGISTRY: Record<string, NpcSpriteDef> = {
  hacker: { spritesheet: "magician" },
  greeter: { spritesheet: "postboy" },
  spyder_shopkeeper: { spritesheet: "shopkeeper" },
  spyder_dante: { spritesheet: "shopassistant" },
  spyder_papermart_miles: { spritesheet: "tennisplayer_green" },
  spyder_papermart_shirley: { spritesheet: "picnicker" },
  spyder_route2_roddick: { spritesheet: "tennisplayer_fiery" },
  spyder_papermart_harith: { spritesheet: "beachcomber" },
  spyder_billie: { spritesheet: "fashionista" },
  spyder_grannypiper: { spritesheet: "picnicker" },
  spyder_papertown_mom: { spritesheet: "fashionista" },
  spyder_papertown_silver: { spritesheet: "tennisplayer_green" },
  spyder_papermart_rafael: { spritesheet: "beachcomber" },
  spyder_papermanor_princeton: { spritesheet: "magician" },
  spyder_healing_center_nurse: { spritesheet: "shopassistant" },
  spyder_cotton_scoop_keeper: { spritesheet: "shopkeeper" },
  spyder_cotton_scoop_assistant: { spritesheet: "shopassistant" },
  cotton_town_monk: { spritesheet: "maniac" },
  cotton_town_florist: { spritesheet: "florist" },
  spyder_citypark_ranger: { spritesheet: "tennisplayer_lapi" },
  spyder_route3_zoolander: { spritesheet: "tennisplayer_fiery" },
  spyder_route4_hiker: { spritesheet: "beachcomber" },
  spyder_timber_nurse: { spritesheet: "shopassistant" },
  spyder_timber_shopkeeper: { spritesheet: "shopkeeper" },
  spyder_timber_beaverbrook: { spritesheet: "homemaker" },
  spyder_leather_nurse: { spritesheet: "shopassistant" },
  spyder_leather_chad: { spritesheet: "tennisplayer_green" },
  spyder_leather_brad: { spritesheet: "tennisplayer_fiery" },
  spyder_leather_guide: { spritesheet: "picnicker" },
  spyder_flower_nurse: { spritesheet: "shopassistant" },
  spyder_flower_petkeeper: { spritesheet: "florist" },
  spyder_flower_shopkeeper: { spritesheet: "shopkeeper" },
  spyder_flower_soldier: { spritesheet: "maniac" },
  spyder_flower_scientist: { spritesheet: "magician" },
  spyder_dojo_fu: { spritesheet: "beachcomber" },
  spyder_dojo_yin: { spritesheet: "picnicker" },
  spyder_dojo_xiang: { spritesheet: "granny" },
  spyder_dojo_zhao: { spritesheet: "homemaker" },
  spyder_candy_nurse: { spritesheet: "shopassistant" },
  spyder_candy_captain: { spritesheet: "beachcomber" },
  spyder_candy_innkeeper: { spritesheet: "homemaker" },
  spyder_candy_barista: { spritesheet: "florist" },
  spyder_greenwash_guard: { spritesheet: "maniac" },
  spyder_nimrod_enforcer: { spritesheet: "tennisplayer_fiery" },
};

export function getNpcSprite(slug: string): NpcSpriteDef {
  return NPC_REGISTRY[slug] ?? { spritesheet: "player" };
}

/** All unique spritesheets that need preloading. */
export function allNpcSpritesheets(): string[] {
  const sheets = new Set<string>();
  for (const def of Object.values(NPC_REGISTRY)) {
    sheets.add(def.spritesheet);
  }
  return [...sheets];
}

/**
 * Player sprite templates available for selection via set_template.
 * Each entry is both the Phaser texture key and the filename (without .png).
 */
export const PLAYER_SPRITE_TEMPLATES = [
  "adventurer",
  "adventurerblack",
  "brownheroine_brown",
  "enbyasian",
  "heroine",
  "penguin",
];
