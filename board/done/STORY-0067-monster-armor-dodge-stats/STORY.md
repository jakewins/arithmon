# STORY-0067: Armor and Dodge stats (melee vs ranged defense split)

## Description

Upstream Tuxemon uses **six** base stats, not four. We're missing **Armor** (resists melee damage) and **Dodge** (resists ranged damage). Right now we only have `defense`, so the `range: "melee" | "ranged"` field on techniques does not affect damage — it's purely flavor text. This story fixes that by adding the two missing stats and updating the damage formula so range matters.

This is small and self-contained; bundle it just before or after STORY-0066 (elements) since both touch `calculateDamage`.

### Upstream reference

- `upstream/tuxemon/monster/stats.py` — six stats: `armour`, `dodge`, `hp`, `melee`, `ranged`, `speed`. ("Attack" splits into `melee` + `ranged`.)
- `upstream/tuxemon/formula.py` — damage formula uses the relevant defensive stat depending on technique range.
- `upstream/mods/tuxemon/db/monster/<slug>.yaml` — every monster yaml has all six base stats under `stats:` (or via shape).

### What to build

1. **Extend `Monster`** with `armor: number` and `dodge: number` fields. Keep `defense` as a single field for now? No — replace `defense` with `armor` (melee) and `dodge` (ranged) so the model matches upstream exactly.
2. **Split `attack` into `melee` and `ranged`** on `Monster`. Both replace `attack`. Damage formula picks the attacker stat based on technique range too (matches upstream).
3. **Backfill base stats** in `src/game/data/monsters.ts` for the 4 existing monsters by reading upstream yamls. The current `baseStats: { hp, attack, defense, speed }` becomes `{ hp, melee, ranged, armor, dodge, speed }`.
4. **Update `calculateDamage()`** in `src/game/combat/formula.ts`:
   - Attacker stat: `technique.range === "melee" ? attacker.melee : attacker.ranged`
   - Defender stat: `technique.range === "melee" ? defender.armor : defender.dodge`
5. **Update level-up scaling** in `Monster.levelUp()` to scale all six stats from `baseStats`, not the four it currently scales.
6. **Update combat UI** — wherever attack/defense are shown (party screen, monster info popup), surface all six stats.

### Decisions for the implementor

- Whether to keep a derived `attack` getter as `Math.max(melee, ranged)` for any legacy UI that still reads it, or rip those out. (Recommend ripping out — see `feedback_dead_code`.)
- Test snapshots for the damage formula will need updating; that's expected.

## QA Validation

Use `/puppeteer`:

1. Spawn an ignibus (low armor, decent dodge in upstream) — verify a melee technique against it deals more damage than a ranged technique with similar power.
2. Inverse: spawn a grintot (high armor, low dodge) — ranged techniques should now out-damage melee.
3. Verify `getState()` exposes all six stats on the party lead.

## Acceptance Criteria

- [x] `Monster` has `hp`, `melee`, `ranged`, `armor`, `dodge`, `speed` (no `attack`/`defense`)
- [x] All 4 existing monsters in `monsters.ts` have base stats for all six fields, sourced from upstream
- [x] `calculateDamage()` picks attacker and defender stats based on `technique.range`
- [x] Level-up scales all six stats
- [x] Combat UI and party/journal screens display all six (or at least don't crash referencing removed fields)
- [x] Tests pass, including new ones for the melee/ranged damage split
- [x] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
