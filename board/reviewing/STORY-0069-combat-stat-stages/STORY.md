# STORY-0069: Battle stat stages (temporary buffs/debuffs)

## Description

Add the **stat stage** system: in-battle temporary modifiers to a monster's stats, ranging from -6 to +6 stages per stat. Each stage applies a nonlinear multiplier (the classic 2/3, 2/4, 2/5… / 3/2, 4/2, 5/2… table). Stages reset at the end of battle. This unlocks moves like growl (lower opponent melee by 1 stage), harden (raise own armor by 1 stage), etc.

Builds on STORY-0068 (technique effects framework). This story adds a new `statStage` effect kind plus the stage state on `Monster` and the damage formula integration.

### Upstream reference

- `upstream/tuxemon/monster/stats.py` and `upstream/tuxemon/combat/` — stat stage table and lookup.
- `upstream/tuxemon/condition/effect/` — see how upstream's status/effect engines mutate stat stages.
- The canonical multiplier table (matches Pokémon Gen II+):
  - Stage -6 → 2/8, -5 → 2/7, -4 → 2/6, -3 → 2/5, -2 → 2/4, -1 → 2/3, 0 → 1.0, +1 → 3/2, +2 → 4/2, +3 → 5/2, +4 → 6/2, +5 → 7/2, +6 → 8/2

### What to build

1. **Stages on `Monster`** — add `statStages: { melee: number; ranged: number; armor: number; dodge: number; speed: number; accuracy: number; }` (default all 0). Reset on combat enter/exit.
2. **Stage multiplier table** in `src/game/combat/statStages.ts` — pure functions:
   - `stageMultiplier(stage: number): number`
   - `effectiveStat(base: number, stage: number): number`
3. **New technique effect** — extend `TechniqueEffect` (from STORY-0068) with `{ kind: "statStage"; stat: StatName; delta: number; target: "self" | "opponent" }`. Add to executor.
4. **Damage formula** uses effective stats — `calculateDamage()` calls `effectiveStat(attacker.melee, attacker.statStages.melee)` instead of the raw stat. Same for the defender.
5. **Reset between battles** — combat machine clears stages when a battle starts and when it ends.
6. **Convert / add techniques** that use stages:
   - `growl` (existing — currently does damage). Convert to `effects: [{ kind: "statStage", stat: "melee", delta: -1, target: "opponent" }]`.
   - `harden` (new). Defense buff: `{ stat: "armor", delta: +1, target: "self" }`.
7. **UI** — show stat stage indicators (e.g., "Atk ↓") in the combat log when a stage changes.

### Decisions for the implementor

- Whether to clamp at ±6 silently or surface "X's attack can't go any higher!" message — recommend the latter for parity.
- How to render stat stages on the HP bar (small arrows? deferred?).

## QA Validation

Use `/puppeteer`. **rockitten** vs **rockitten** is a fine setup (both with melee moves so the effect is obvious).

1. Spawn a rockitten in the party, force a wild rockitten opponent.
2. Use `ram` first turn, record the damage dealt.
3. Reset. Use `growl` on the opponent twice (puts opponent's melee at -2). Then use `ram`. Damage should be ~half of the baseline (multiplier 2/4 = 0.5).
4. Repeat with `harden` on self → verify melee damage taken drops accordingly.
5. Win/lose the battle, start a new one, confirm stages reset to 0.

## Acceptance Criteria

- [x] `Monster.statStages` exists for melee/ranged/armor/dodge/speed/accuracy
- [x] `stageMultiplier()` returns correct values for -6..+6
- [x] `calculateDamage()` uses effective stats
- [x] `statStage` technique effect implemented and unit tested
- [x] At least 2 stage-modifying techniques shipped (growl debuff, harden buff)
- [x] Stages reset at battle start and end
- [x] Combat log shows stage-change messages
- [x] QA confirms growl-then-ram deals ~½ damage vs baseline
- [x] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
