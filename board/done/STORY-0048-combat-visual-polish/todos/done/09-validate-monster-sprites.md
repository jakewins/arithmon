# Todo: Validate All Monster Sprites

## What

Use the debug battle command and puppeteer to systematically screenshot every monster in battle, verify they look correct, and fix any issues.

## Why

With 11 monsters and the visual changes from earlier todos, we need to verify that every monster's front and back sprite renders correctly -- right orientation, proper framing, good positioning on the island platform.

## Monster Checklist

For each monster, spawn a battle where it appears as both the player's monster (back sprite) and the enemy (front sprite). Take screenshots and verify:

- [ ] **rockitten** -- `A.spawnBattle("rockitten", "rockitten")`
- [ ] **budaye** -- `A.spawnBattle("budaye", "budaye")`
- [ ] **ignibus** -- `A.spawnBattle("ignibus", "ignibus")`
- [ ] **grintot** -- `A.spawnBattle("grintot", "grintot")`
- [ ] **memnomnom** -- `A.spawnBattle("memnomnom", "memnomnom")`
- [ ] **dollfin** -- `A.spawnBattle("dollfin", "dollfin")`
- [ ] **pairagrin** -- `A.spawnBattle("pairagrin", "pairagrin")`
- [ ] **aardorn** -- `A.spawnBattle("aardorn", "aardorn")`
- [ ] **cataspike** -- `A.spawnBattle("cataspike", "cataspike")`
- [ ] **cardiling** -- `A.spawnBattle("cardiling", "cardiling")`
- [ ] **eyenemy** -- `A.spawnBattle("eyenemy", "eyenemy")`

## What to Check

For each monster screenshot:
1. **Full sprite visible** -- no cut-off edges, feet, tails, or heads
2. **Correct orientation** -- front sprite faces left (toward player), back sprite faces right (away from player toward enemy). If a sprite faces the wrong way, it needs to be flipped via `setFlipX(true)`
3. **Proper positioning** -- monster sits naturally on the island platform, not floating above or sunk below
4. **Reasonable scale** -- sprite isn't too large or too small relative to the island and screen

## Fixing Issues

Common fixes if a monster looks wrong:
- **Wrong facing**: Add `setFlipX(true)` for that specific monster (may need per-monster config)
- **Bad vertical position**: Adjust the sprite's Y offset relative to the island (may need per-monster `yOffset` in monster data)
- **Sprite too large/small**: Add per-monster scale override if the default 2x doesn't work
- **Sprite content issue**: The sprite sheet itself may need regeneration from upstream source files

If per-monster adjustments are needed, add a `battleSprite` config to the monster definition:
```typescript
battleSprite?: {
  flipFront?: boolean;
  flipBack?: boolean;
  yOffset?: number;
  scale?: number;
}
```

## Process

1. Launch the game via puppeteer
2. Navigate to the overworld (or use debug commands)
3. For each monster in the checklist:
   a. Call `A.spawnBattle(slug, slug)` via puppeteer
   b. Take a screenshot
   c. Evaluate the result
   d. If issues found, fix and re-test
   e. Exit the battle (run or use debug command)
4. Take a final "showcase" screenshot with a visually interesting matchup

## Verification

- All 11 monsters have been screenshotted and verified
- No sprites are cut off, wrongly oriented, or badly positioned
- Any per-monster fixes have been applied and re-verified
