export interface NpcSpriteDef {
  spritesheet: string;
}

const NPC_REGISTRY: Record<string, NpcSpriteDef> = {
  hacker: { spritesheet: "magician" },
  greeter: { spritesheet: "postboy" },
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
