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

See `todos/open/01-port-player-sprite-pngs.md` for the fix steps.
