export interface NpcSpriteDef {
  spritesheet: string;
  frame: number;
}

const NPC_REGISTRY: Record<string, NpcSpriteDef> = {
  hacker: { spritesheet: "player", frame: 1 },
  greeter: { spritesheet: "player", frame: 4 },
  guard: { spritesheet: "player", frame: 7 },
};

export function getNpcSprite(slug: string): NpcSpriteDef {
  return NPC_REGISTRY[slug] ?? { spritesheet: "player", frame: 1 };
}
