# STORY-0201 — Journal

## 2026-05-20 — Reviewer findings (approve)

### Validated

- `MonsterDef` extended with optional `txmnId`, `species`, `shape`,
  `heightCm`, `weightKg`, `descriptionKey` — all optional, won't break
  partially-ported monsters.
- All 5 bin monsters (`rockitten`, `lambert`, `nut`, `tweesher`,
  `agnite`) match upstream YAMLs exactly (`txmn_id`, `species`, `shape`,
  `height`, `weight`). Note: upstream `shape` uses the broader stats-shape
  enum (`hunter`, `dragon`, `flier`, ...), not the limited body-type list
  in the story description. Implementor correctly reuses `ShapeSlug`.
- `public/assets/ui/background/tux_info.png` byte-identical to upstream.
- 13 element-type small icons byte-identical via `cmp` (upstream has no
  `aether_type_small.png`; commit message correctly notes the discrepancy
  with the story's 14-icon list).
- All required l10n keys present in `en_US.po`: `monster_menu_*`,
  `no_evolution` / `yes_evolution` / `yes_evolutions`, per-monster
  `cat_<species>` + `<slug>_description`, type names, body-type names.
- `MonsterInfoScene` renders the full layout — ID, name (uppercase),
  species, height/weight, type icon + label, body type, description
  (wordwrapped), evolution heading + chain.
- `open_journal` action launches `MonsterInfoScene`, marks the monster
  as seen, and stays `done=false` until the scene shuts down — the
  event engine's `blocking` flag holds chained dialogs back. Unit test
  added in `event-actions-new.test.ts` covers the blocking behaviour
  across multiple ticks.
- `JournalScene` (list view) kept — still referenced by
  `PauseMenuScene` and `debug.openJournal()`. Justification recorded in
  the commit body.
- Pre-commit gates: `npm run format:check`, `npm run lint`,
  `npx tsc --noEmit`, `npm test` (441 tests) all pass.
- QA: `qa/monster-info-viewer-test.ts` passes against the dev server
  on port 8082. Screenshot diff vs reference
  (`/home/jake/Pictures/Screenshots/20260520_133200.png`) shows a
  faithful port — all fields render in the correct positions, sprite
  centred in the striped frame, wood type icon and "Wood" label
  present, "It is placed in its nut by its parent, who then sends it
  into the world." description, `Evolution` heading with `LEGKO`.

### Notes (non-blocking)

- The calling scene is not paused on launch — instead, the event
  engine stays blocking via `done=false`, which keeps player input and
  the action queue suspended (see `OverworldScene.update`:
  `blocked = this.eventEngine.blocking || this.controlsState.locked`).
  Behaviourally equivalent to a scene-pause for this flow.
