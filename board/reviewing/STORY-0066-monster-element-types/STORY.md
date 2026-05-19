# STORY-0066: Monster element types and effectiveness chart

## Description

Give monsters and techniques an **element type** (fire, water, earth, wood, etc.) and wire up the type-effectiveness chart so damage is modified by matchups. This is the most foundational engine gap vs. upstream — without it, all attacks deal the same damage regardless of matchup, which removes a huge chunk of strategic depth.

This story stops at damage multipliers. Status conditions, stat stages, and held items come later; this story should not entangle with them.

### Upstream reference

- `upstream/tuxemon/element.py` — `Element` class, loads from DB, holds per-type multipliers.
- `upstream/mods/tuxemon/db/element/*.yaml` — 13 elements: `cosmic, earth, fire, frost, heroic, lightning, metal, normal, shadow, sky, venom, water, wood`. Each defines `against:` multipliers for every other element.
- `upstream/tuxemon/combat/` — see how `ElementTypesHandler` applies multipliers during damage calculation.
- Each monster yaml has `types: [earth]` (or two types); each technique yaml has its own element.

### What to build

1. **Element data** — port the 13 elements and their multiplier tables from `upstream/mods/tuxemon/db/element/*.yaml` into `src/game/data/elements.ts` as a typed `ELEMENTS` record. Keep the data table-driven so future tweaks are config-only.
2. **Element field on monsters** — extend `MonsterDef` in `src/game/data/monsters.ts` with `types: ElementSlug[]` (1–2 elements). Backfill the 4 existing monsters (rockitten = earth, budaye = wood, ignibus = fire, grintot = earth — see upstream yamls).
3. **Element field on techniques** — extend `TechniqueDef` in `src/game/data/techniques.ts` with `element: ElementSlug`. Backfill existing techniques (look up each in `upstream/mods/tuxemon/db/technique/*.yaml`). For techniques we invented that don't exist upstream, pick the closest reasonable element.
4. **Effectiveness lookup** — `effectivenessMultiplier(attackElement, defenderTypes): number` in a new `src/game/combat/elements.ts`. If defender has two types, multipliers stack (multiply both).
5. **Wire into damage formula** — `calculateDamage()` in `src/game/combat/formula.ts` multiplies the result by the effectiveness multiplier. Surface the multiplier so the combat UI can show "It's super effective!" / "It's not very effective…" messages.
6. **Combat UI feedback** — show effectiveness text in the combat log after an attack lands.

### Decisions for the implementor

- Whether to lazy-validate that every technique/monster slug references a known element at module load, or at first use. (Recommend at module load — fail fast.)
- How to surface effectiveness in the UI message stream (e.g., extra line in the action log vs. a flash on the HP bar).

## QA Validation

Use `/puppeteer`. Spawn an **ignibus (fire)** in the player's party and a **budaye (wood)** as the opponent. Fire vs. wood is 2× in upstream — a single `ember` should hit noticeably harder than the same `ember` against a `grintot (earth)` opponent (fire vs. earth is 0.5×).

Steps:
1. Launch game, `setupGame`, force-spawn an ignibus party lead.
2. `A.startCombat("budaye", level=5)`, use `ember`, record damage.
3. Reset, `A.startCombat("grintot", level=5)`, use `ember`, record damage.
4. Assert: damage in (2) is ~4× damage in (3) (2× ÷ 0.5×).
5. Verify the combat log says "It's super effective!" in (2) and "It's not very effective…" in (3).

## Acceptance Criteria

- [x] All 13 elements + their multiplier tables ported from upstream into `src/game/data/elements.ts`
- [x] `MonsterDef.types` and `TechniqueDef.element` fields exist and are populated for every existing monster/technique
- [x] `effectivenessMultiplier()` correctly computes single-type and dual-type multipliers
- [x] `calculateDamage()` applies the multiplier
- [x] Combat UI surfaces super-effective / not-very-effective / immune feedback
- [x] QA puppeteer script confirms fire-vs-wood vs. fire-vs-earth damage delta
- [x] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
