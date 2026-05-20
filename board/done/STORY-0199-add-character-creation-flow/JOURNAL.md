# STORY-0199 — Journal

## 2026-05-20 — Reviewer findings (bounce back)

### Validated

- `public/assets/events/start_tuxemon.yaml` is byte-identical to
  `upstream/mods/tuxemon/maps/start_tuxemon.yaml` (12 events, all gating
  conditions intact).
- All 12 character-creation msgids are present in
  `public/assets/l10n/en_US.po` (`spyder_campaign`, `xero_campaign`,
  `water_campaign`, `gender_male/female/nonbinary`, `gender_enby`,
  `gender_whatever`, `black_male/female`, `white_male/female`).
- `choice_gender` background image is in
  `public/assets/ui/background/choice_gender.png` and renders in step 2/3.
- `set_char_attribute` and `set_template` actions are implemented and
  registered (pre-existing from STORY-0013; `set_template` correctly maps
  to `session.player.template`).
- `TitleScene` no longer carries `NEW_GAME_MAP`/`SPAWN_X`/`SPAWN_Y` —
  cleanly removed per `[[feedback_dead_code]]`.
- `CutsceneScene` was extended (optional `callerScene`, fallback i18n
  preload from cache) — clean change.
- Pre-commit gates: `npm run format:check`, `npm run lint`,
  `npx tsc --noEmit`, `npm test` (440 tests) all pass.
- QA tests pass against the dev server:
  `qa/title-screen-test.ts`, `qa/bedroom-intro-test.ts`,
  `qa/character-creation-test.ts` (both male-white and female-black
  branches), `qa/shop-purchase-test.ts`, `qa/smoke.ts`.
- Visual: scenario / gender / race choice menus render correctly over
  the `gradient_blue` + `choice_gender` background, and the final
  transition lands on `spyder_bedroom.tmx,4,4`.

### Defect — bouncing back

- **All six player template PNGs in `public/assets/sprites/` are
  byte-identical placeholders** (md5
  `62b07c1edb295b275dec3e311efe24fb`, 1907 bytes — a copy of the
  male/white `adventurer.png`). `brownheroine_brown.png`,
  `adventurerblack.png`, `enbyasian.png`, `heroine.png`, and
  `penguin.png` all share that md5, while the upstream files differ
  (1840–2227 bytes each). Result: every race-choice branch
  `set_template player,<world>,<combat>` runs, the session template
  string updates correctly, but the rendered overworld sprite on
  `spyder_bedroom` is always the same male-white adventurer — i.e.
  the user-visible point of character creation is silently broken.
- The QA test missed this because it only asserts
  `session.player.template === "brownheroine_brown"` (the slug) and
  does not check the actual texture key bound to the rendered player
  sprite. Side-by-side `qa/screenshots/character-creation-male-white-final.png`
  and `qa/screenshots/character-creation-female-black-final.png` show
  identical pixels for the player.
- This is exactly the failure mode flagged by
  `[[feedback_sprite_byte_compare]]` — pre-existing placeholder PNGs
  shadowing the real upstream art because no byte-level compare was
  run against upstream.

See `todos/done/01-port-player-sprite-pngs.md` for the fix steps.

## 2026-05-20 — Re-implementor notes

- Copied the six real upstream PNGs into `public/assets/sprites/`
  verbatim: `adventurer.png`, `adventurerblack.png`,
  `brownheroine_brown.png`, `enbyasian.png`, `heroine.png`,
  `penguin.png`. All six `cmp` clean against
  `upstream/mods/tuxemon/sprites/` and all are 48×128 RGBA per
  `[[project_npc_sprite_assets]]`.
- Exposed the player sprite's live `texture.key` via
  `OverworldScene.getDebugState()` as `player.texture` — fits the
  existing per-scene `getDebugState` convention in `src/game/debug.ts`
  (no new top-level bridge method needed).
- Tightened `qa/character-creation-test.ts` to assert
  `state.player.texture === spec.template` in addition to the
  pre-existing `session.template` check, so a future placeholder-PNG
  regression would fail the test instead of slipping through. Per
  `[[feedback_sprite_byte_compare]]`.
- Re-ran both branches (`male-white` → `adventurer`, `female-black` →
  `brownheroine_brown`) — pass. Final-frame screenshots show visibly
  distinct sprites (different md5s, different file sizes); eyeballed
  both — male-white is a male with blue cap + orange shirt, female-black
  is a female with brown hair + blue dress.
- Re-ran `qa/title-screen-test.ts`, `qa/bedroom-intro-test.ts`,
  `qa/smoke.ts` — all pass.
- Pre-commit gates: `npm run format:check`, `npm run lint`,
  `npx tsc --noEmit`, `npm test` (440/440) all pass.
- Moved `todos/open/01-port-player-sprite-pngs.md` → `todos/done/`.

## 2026-05-20 — Reviewer findings (re-review, approved)

### Validated

- All six player template PNGs in `public/assets/sprites/`
  (`adventurer`, `adventurerblack`, `brownheroine_brown`, `enbyasian`,
  `heroine`, `penguin`) are `cmp`-clean against
  `upstream/mods/tuxemon/sprites/` and have six distinct md5s.
- Each PNG's IHDR confirms 48×128 dimensions per
  `[[feedback_npc_qa_dimension_check]]`.
- `qa/character-creation-test.ts` now asserts
  `state.player.texture === spec.template` against the live
  `this.player.texture.key` exposed by `OverworldScene.getDebugState`.
- `qa/character-creation-test.ts` runs both branches (`male-white` →
  `adventurer`, `female-black` → `brownheroine_brown`) — both pass.
  Final-frame screenshots
  (`qa/screenshots/character-creation-{male-white,female-black}-final.png`)
  are visibly distinct: male-white renders a male with blue cap +
  orange shirt; female-black renders a brown-haired female in a blue
  dress. md5s of the two final PNGs differ.
- Curated QA suite re-run: `qa/smoke.ts`, `qa/title-screen-test.ts`,
  `qa/bedroom-intro-test.ts` (both skip + cinematic paths),
  `qa/shop-purchase-test.ts` — all pass against the port-8082 dev
  server.
- Pre-commit gates: `npm run format:check`, `npm run lint`,
  `npx tsc --noEmit`, `npm test` (440/440) all pass.
- `OverworldScene.getDebugState()` `player.texture` addition is a
  one-line extension of the existing per-scene debug state object —
  consistent with the convention used elsewhere in `src/game/debug.ts`.

### Note (non-blocking)

- The QA assertion technically doesn't catch the *exact* original
  regression: each PNG is loaded under its own Phaser texture key
  (`this.load.spritesheet(template, ...)`), so `player.texture.key`
  equals the template slug regardless of underlying PNG bytes. The
  assertion does catch a wrong-template-binding on the player sprite
  (a related but distinct failure mode), and the underlying PNG fix
  is the load-bearing change. If we want true byte-level regression
  protection, a future story could add a small unit test that
  `md5sum`s `public/assets/sprites/<template>.png` against a fixture
  — out of scope here.

### Verdict

Approve — moving to `board/done/`.
