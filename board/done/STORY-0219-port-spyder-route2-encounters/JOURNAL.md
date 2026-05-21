# STORY-0219 Journal

## What was done

Ported `spyder_route2` wild encounters verbatim from upstream — both the
encounter table (5 species × 2 daytimes = 10 rows) and the 33 grass-tile
`random battle*` event objects that drive `random_encounter spyder_route2,11`
on each step. Wired the engine's encounter roll to consult the session's
time-of-day so day vs night picks match upstream YAML exactly.

## Open-question decisions

- **Day/night gating** picked option (a) — extend `EncounterEntry` with an
  optional `daytime?: boolean` and filter inside `rollEncounter`. Single
  table, single rolling code path; matches how upstream's `variables:` filter
  reads at roll time rather than at table-build time. The filter falls back
  to the unfiltered table when it zeros out so a missing time-stage at boot
  never silently kills encounters.
- **`play_map_animation`** was just stubbed with a warning (the spammy
  every-step grass-shake), matching the story's explicit out-of-scope note.

## Changes

- `src/game/data/encounters.ts` — replaced the flattened, fabricated
  `spyder_route2` block with the verbatim 10-row port from
  `upstream/mods/tuxemon/db/encounter/spyder_route2.yaml`. Added optional
  `daytime?: boolean` to `EncounterEntry` and an `isDaytime()` helper that
  maps `session.timeStage` ∈ {dawn, morning, day} → daytime=true,
  {dusk, night} → false (matches upstream's stage-of-day binning).
  `rollEncounter(table, daytime?)` filters by the flag and falls back to the
  unfiltered table if every row gets excluded. Also exposes a
  `encounterDebugFlags.forceRoll` QA flag (see QA section below).
- `src/game/event/actions/randomEncounter.ts` — pipes `session.timeStage`
  through `isDaytime()` into `rollEncounter`, and short-circuits the
  probability check when `encounterDebugFlags.forceRoll` is set.
- `src/game/scenes/OverworldScene.ts` — `startCombat()` (the legacy
  per-tile encounter trigger) now passes the same daytime flag to
  `rollEncounter` so manual `startCombat()` calls behave consistently.
- `src/game/event/actions/stubs.ts` — registered `play_map_animation` as a
  warning-stub so the new event YAML loads cleanly (full grass-shake overlay
  remains out of scope).
- `public/assets/events/spyder_route2.yaml` — appended **33** `random
  battle*` events, one per upstream object id (97, 101–103, 107–109, 111–119,
  122–133, 176, 195, 196, 199, 200). Coordinates converted from TMX pixels
  (÷ 16) to tile units; widths/heights preserved verbatim so safe paths
  through dirt tiles remain reachable. The two upstream-duplicate
  `random battle16` names (ids 116 & 176) are disambiguated as
  `random battle16 A` / `random battle16 B` so the YAML loader's
  Record-keyed map doesn't collapse them.
- `src/game/debug.ts` — added `setTimeStage(stage)` and
  `setForceEncounterRoll(on)` QA bridges. The Math.random monkey-patch
  trick I tried first broke `MathProblemScene` UUID/texture init (the
  all-zero UUID `00000000-0000-4000-8000-000000000000` collides on second
  use), so a dedicated bypass flag is the safer hook.
- `qa/harness.ts` — typed the two new bridge methods and re-exported a
  `setTimeStage` helper.
- `src/__tests__/encounters.test.ts` — new vitest suite covering
  `getEncounterTable` (verbatim row-by-row port for spyder_route2),
  `isDaytime` (table-driven five-stage mapping), and `rollEncounter`
  day/night filtering + empty-pool fallback.
- `qa/route2-encounters-test.ts` — Playwright smoke test with three cases:
  day forced-roll on grass triggers cataspike/aardorn/etc. at L3–7, night
  forced-roll triggers the same set at the bumped L3–8 ranges, dirt-road
  walk fires no encounter even with the force flag on. Screenshots
  committed under `qa/screenshots/route2-encounter-{day,night,safe-path}.png`.

## Verification

- `npm run format:check && npm run lint && npx tsc --noEmit && npm test` —
  all clean. 43 test files, 477 tests, 10 of them new.
- `ARITHMON_PORT=8081 HEADLESS=1 npx tsx qa/route2-encounters-test.ts` —
  all three subtests pass. Day pick: cataspike L6. Night pick: aardorn L5.

## Out of scope (per story)

- Real `play_map_animation` grass-shake overlay (still a logging stub).
- Other-map encounter tables.
- Trainers / signs / Billie / environment day-night swap (separate stories).

## 2026-05-21 — Reviewer findings

- Verified encounter table: 10 rows (5 species × 2 daytimes), weights and level ranges match upstream `spyder_route2.yaml` verbatim
- Verified `play_map_animation` stubbed in `stubs.ts` (logs args, no-ops)
- Verified 33 `random battle*` events appended to `spyder_route2.yaml`; duplicate `random battle16` (ids 116 & 176) disambiguated as A/B
- Verified `rollEncounter` filters by `isDaytime()`, falls back to unfiltered pool if all rows excluded
- Pre-commit gates: `npm run format:check && npm run lint && npx tsc --noEmit && npm test` — all pass (477 tests including 10 new encounter tests)
- QA: `ARITHMON_PORT=8082 HEADLESS=1 npx tsx qa/route2-encounters-test.ts` — 3/3 subtests pass (day encounter, night encounter, safe-path no-encounter)
- Screenshots committed at `qa/screenshots/route2-encounter-{day,night,safe-path}.png`
- **Approved**
