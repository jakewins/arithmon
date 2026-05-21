# STORY-0212 — Journal

## 2026-05-21 — Implementation

### Files changed

- `public/assets/maps/spyder_paper_daycare.json` — replaced the 15×10
  candy-center-clone stub with a verbatim Tiled JSON export of
  `upstream/mods/tuxemon/maps/spyder_paper_daycare.tmx` (14×9, four
  tile layers — `Layer 1` / `Layer 2` / `Layer 3` / `Above Player`
  (opacity 0.97) — three tilesets at upstream firstgids 1 / 3865 /
  7729, all 7 collision rects, map properties incl. `slug=daycare`).
- `public/assets/events/spyder_paper_daycare.yaml` — `cp`-verbatim
  from `upstream/mods/tuxemon/maps/spyder_paper_daycare.yaml`
  (`diff` clean — 0 byte differences). Replaces the hand-written 8-
  event stub with all 14 upstream events: Create Granny Piper,
  FlashBack Billie Grandma, Music, Pamphlet 1 / 2, Return Monster
  No, the three Granny talk branches (pre-Timber, post-Timber
  intro, no-monster, has-monster), and the front/back teleports.
- `src/game/event/actions/setLayer.ts` — fixed a latent runtime
  crash. The action referenced the global `Phaser.Display.Color`
  symbol without importing it; the file had compiled fine because
  the *type* reference (`Phaser.GameObjects.Rectangle`) was erased,
  but the runtime call to `Phaser.Display.Color.GetColor` threw
  `ReferenceError: Phaser is not defined` the first time
  `set_layer` actually fired. Inlined the color packing
  (`(r << 16) | (g << 8) | b` — same as `Display.Color.GetColor`)
  rather than `import { Display } from "phaser"`, because pulling
  Phaser at module-load breaks the vitest-running event engine
  (Phaser's init touches `window` and crashes in node). Comment
  added explaining the choice.
- `qa/paper-daycare-test.ts` — new 11-test puppeteer suite (see
  below).
- `qa/screenshots/paper-daycare-upstream-reference.png` — committed
  via `git add -f` (the screenshots dir is gitignored). Rendered
  by drawing the daycare's three upstream tilesets onto an HTML
  canvas in a headless chromium (script in `qa/local/`, gitignored).

### Engine-side notes (per the story's "Engine-side considerations")

- `daycare player` is registered as a stub in `stubs.ts:26` —
  prints `daycare (stub — not yet implemented)` and completes
  immediately. No deposit/withdraw UI; the dialog around it
  (`grannypiper4`) plays normally and the action chain finishes
  without crashing.
- `set_template player,invisible` works (the session's
  `player.template` becomes `"invisible"`; verified in QA via
  `getState`). Whether the engine actually hides the sprite when
  the template is `"invisible"` is a separate render concern — the
  flashback cutscene still completes and teleports correctly.
- `set_layer 102:51:0:128` works after the fix above — the sepia
  overlay rectangle is added to the scene at depth 50 (verified by
  the flashback QA reaching the end-of-cutscene teleport without
  pageerror).
- All other actions / conditions used in the YAML were already
  registered.

### Out-of-scope but worth flagging

- The story's "Engine-side considerations" warned that the
  back-door teleport from town fires when the player walks onto
  `(22,3)` — actually upstream's town TMX (and our verbatim copy)
  trigger is at `(21,3)` and requires `is char_facing player,left`.
  Verified in `spyder_paper_town.yaml:498`. The QA test walks the
  player from `(22,3)` west onto `(21,3)` facing left.
- The flashback event has no `x`/`y`, so our engine fires it on map
  entry. If the player's spawn tile happens to also be on a
  teleport trigger (e.g. `(3,8)` is on the "Teleport to Cotton
  Town" front-door event at `(2,8)` width=2 height=1), the trigger
  fires *first* and bounces the player to paper_town before the
  flashback's `lock_controls` runs. QA spawns the player at `(3,5)`
  (clear of any trigger) for the flashback test.

### Verification

- `npm run format:check && npm run lint && npx tsc --noEmit && npm test` — all green (465 tests).
- `qa/paper-daycare-test.ts` — all 11 sub-tests pass against dev server on port 8086:
  1. Front-door entry from `spyder_paper_town (20,4)` → `daycare (3,8)`, Granny auto-spawned at `(3,6)` facing right.
  2. Pre-Timber first-meeting greeting (Talk Granny Piper1) — dialog text starts with "Oh hello"; sets `spokengrannypiper=yes`.
  3. Pre-Timber repeat greeting (Talk Granny Piper2) — different dialog from first.
  4. Post-Timber introduce-daycare (Talk Granny Piper Open 1) — long monologue; sets `introducedaycare=yes`.
  5. Post-Timber + post-intro no-monster branch (Talk Granny Piper No Monster) with `monsters: []`.
  6. Post-Timber + post-intro has-monster branch (Talk Granny Piper Yes Monster) with a 2-monster party — fires the stubbed `daycare player` without hanging.
  7. Pamphlet 1 (post-Timber, `grannypiper8`) at `(8,5)`.
  8. Pamphlet 2 (pre-Timber, `grannypiper10` — "business plan") at `(8,5)`.
  9. Front-door exit at `(3,8)` facing down → `paper_town (20,5)`.
  10. Back-door entry from `paper_town (21,3) → daycare (13,7)`.
  11. Back-door exit at `(13,7)` facing right → `paper_town (22,3)`.
  12. Flashback cutscene: spawn at `(3,5)` with `billie_grandma:yes` → cutscene fires automatically, 13 dialogs play, Billie spawns at `(13,7)` and pathfinds to `(4,6)` then to `(3,8)` (despawns), Granny walks to `(2,3)`, final dialog, `billie_grandma:done`, `flashback:off`, player teleports to `spyder_paper_rival_downstairs (7,9)`.
- `qa/paper-scoop-intro-test.ts`, `qa/paper-scoop-talk-dante-test.ts`, `qa/paper-town-buildings-test.ts`, `qa/bedroom-intro-test.ts`, `qa/smoke.ts` all still pass — no regressions from the map/YAML replacement or the `setLayer` fix.
- `qa/paper-town-bins-test.ts` was failing pre-existing on a clean tree (verified via `git stash`); not a regression from this story.

### Sprite / l10n verification

- `cmp public/assets/sprites/granny_yellow.png upstream/mods/tuxemon/sprites/granny_yellow.png` — 0 byte diff.
- `file` confirms dimensions are 48×128.
- All 7 Granny msgids and all 13 Billie flashback msgids (`spyder_papertown_grannypiper{1,2,3,4,8,9,10}`, `spyder_billie_flashback{1..12}`, `spyder_billie_flashback_end`) resolve to non-empty translations in `public/assets/l10n/en_US.po`.

## 2026-05-21 — Reviewer findings

Approved.

- Map JSON: 14×9, firstgids 1/3865/7729, four correct layer names, all 7 collision rects match upstream TMX ids (8/12/13/16/18/24/25), `Above Player` opacity 0.97, properties `edges=clamped, inside=true, slug=daycare, scenario=spyder, map_type=notype`. Verified via JSON parse.
- Event YAML: `diff` against upstream is clean (zero byte differences). All 14 events present, all names match upstream.
- Sprite: `cmp granny_yellow.png` returned 0 — byte-identical to upstream.
- l10n: All 7 Granny msgids and all 13 Billie flashback msgids present in `en_US.po` with non-empty `msgstr` values (multi-line PO format confirmed).
- `setLayer.ts` fix: latent `ReferenceError: Phaser is not defined` at runtime — inline color packing is clean and the comment explains why the import was avoided. Correct fix.
- Pre-commit gates: `format:check`, `lint`, `tsc --noEmit`, `npm test` (465/465) — all green.
- QA: all 11 `paper-daycare-test.ts` sub-tests pass on port 8082 — front/back door entries land at correct tiles, Granny spawns correctly, all three dialog branches fire under the right variable conditions, both pamphlet variants, both exits teleport to correct town tiles, flashback cutscene completes and leaves player at `spyder_paper_rival_downstairs (7,9)` with `billie_grandma=done` and `flashback=off`.
- Smoke + shop-purchase: no regressions.
- Screenshots: upstream reference and front-entry layout match (same furniture, bookshelf, rugs, windows). Noted slight darker tint in engine render — acknowledged as out-of-scope render concern in implementor's journal.
- Test scope: 11 tests is appropriate for this port — covers all dialog branches, both entrances/exits, and the flashback. Not over-tested.

### Reference screenshot

Generated by rendering the upstream TMX (via our exported JSON +
upstream PNGs) on an HTML canvas in headless chromium, then capturing
the canvas. The script lives in `qa/local/render-daycare-upstream.ts`
(gitignored); the produced PNG is committed at
`qa/screenshots/paper-daycare-upstream-reference.png`.

Comparing with `qa/screenshots/paper-daycare-front-entry.png`: same
furniture placement, same bookshelf at top-left, same two windows
on the north wall, same two chairs facing south + table-with-food
in the center, same red rugs (south-west and east), same pamphlet
sign at right, same plant pots at bottom-left and bottom-center,
same brick floor. The engine screenshot is uniformly darker than
the upstream reference — likely the `Above Player` layer at
opacity 0.97 is being applied as an additional dim overlay, or the
indoor lightmap is currently more aggressive than upstream's. Not
addressed here (out of scope — render concern), but worth noting.
