# Journal: STORY-0200 port spyder_downstairs

## 2026-05-20 — Reviewer findings

Approved. Story moves from `reviewing` to `done`.

**Validated OK:**
- `public/assets/events/spyder_downstairs.yaml` is a verbatim mechanical
  port of all 12 `<object type="event">` entries in
  `upstream/mods/tuxemon/maps/spyder_downstairs.tmx`. Tile coords
  cross-checked against pixel coords: Play Music (0,0), Go Upstairs
  (0,1) → bedroom 8,2, Home Sign (1,1), Watch TV (1,5), Create
  Homemaker (4,4) spawning at (5,5), Go Outside (4,6) → paper_town
  10,7, and Talk mom1-6 at (8,1)-(8,6). All upstream conditions
  preserved exactly, including the mutually-exclusive `spokenmom` /
  `party_size` / `battle_outcome zoolander` / `captainreturns` /
  `omnichannelradioannounce` gates.
- `Talk mom` events keep upstream `behav: talk spyder_papertown_mom`;
  loader expands that into `char_facing_char` + `INTERACT` conditions
  plus a `char_face npc,player` action — same pattern as bedroom port.
- `char_wander` registered as a no-op stub in
  `src/game/event/actions/stubs.ts`. Action is documented inline,
  upstream syntax noted, and the deviation is called out in the YAML
  comment above Create Homemaker. Mom NPC still spawns and is fully
  interactable, she just doesn't pace.
- `spyder_papertown_mom` NPC entry pre-existing with
  `spritesheet: "homemaker"`, matching upstream `template.sprite_name`
  in `db/npc/spyder_paper_town_npcs.yaml`. The
  `public/assets/sprites/homemaker.png` is byte-identical to
  `upstream/mods/tuxemon/sprites/homemaker.png` (verified via `cmp`)
  and 48×128, the expected NPC layout.
- All required msgids already present in
  `public/assets/l10n/en_US.po`: `spyder_papertown_mom1` through
  `mom6`, plus `spyder_papertown_home` and `spyder_papertown_tvwatch`.
- `setupGame()` accepts arbitrary map slugs — no allow-list to
  update; the existing harness Just Works for `spyder_downstairs`.

**Pre-commit gates re-run inside reviewer worktree (all pass):**
- `npm run format:check` — Prettier clean
- `npm run lint` — ESLint clean
- `npx tsc --noEmit` — no type errors
- `npm test` — 41 files, 440 tests pass

**Live QA (port 8082):**
- `qa/spyder-downstairs-test.ts` — all three scenarios pass:
  mom-spawn-and-talk (mom1 → mom3 progression), Go Outside trigger to
  paper_town (10,7), and bedroom Go Downstairs handoff back into
  this map at (0,2). Confirms STORY-0195 ↔ STORY-0200 linkage.
- `qa/smoke.ts`, `qa/shop-purchase-test.ts`, `qa/bedroom-intro-test.ts`,
  `qa/title-screen-test.ts` — all pass unchanged.

**Notes on scope:**
- Story description mentioned bedroom's `Go Downstairs` event sends
  the player to `spyder_downstairs.tmx,0,2`, and the upstream
  bedroom→downstairs trigger lives at (7,2). The downstairs Go
  Upstairs event correctly returns the player to bedroom (8,2), as
  per upstream — not (7,2). YAML faithfully reflects upstream.
- Scope was correctly trimmed: map JSON, tileset PNGs, NPC entry,
  and msgids were all pre-existing from prior porting work, so the
  diff is just the events YAML, the `char_wander` stub, and the QA
  test. Implementor's commit message clearly documents what was
  already in place vs. what they added.
