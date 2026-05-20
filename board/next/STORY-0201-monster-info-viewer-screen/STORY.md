# STORY-0201: Monster info viewer screen ("Journal Info" / Pokédex-style detail)

## Description

Add the per-monster detail screen that the `open_journal <monster_slug>` event action pushes — see `/home/jake/Pictures/Screenshots/20260520_133200.png` for the reference layout. Upstream calls this `JournalInfoState`. It's the screen the paper-town bin events show when the player inspects a bin: a striped frame around the front sprite, plus ID / name / species / height / weight / type-icon(s) / body-type / description / evolution chain.

Our current implementation is a stub: `src/game/event/actions/openJournal.ts` launches `JournalScene`, which renders a *list* of monsters in the registry — not the upstream single-monster detail page. STORY-0196 (paper-town port) depends on this story to render bin interactions correctly.

**Depends on**: none. This is a self-contained UI story.

### Upstream reference

- `upstream/tuxemon/states/journal_info.py` — the `JournalInfoState` class. Read `add_menu_items` for the field layout.
- `upstream/tuxemon/event/actions/open_journal.py` — pushes `JournalInfoState` with `character=session.player, monster=<looked up>, source="open_journal", reveal=True`. `reveal=True` means render the full page even if the monster hasn't been caught — that's what we need for the bin-inspect flow.
- `upstream/mods/tuxemon/gfx/ui/background/tux_info.png` — the cream background with blue border.
- `upstream/mods/tuxemon/gfx/ui/icons/element/<type>_type_small.png` — 14 element-type icons (`aether`, `cosmic`, `earth`, `fire`, `frost`, `heroic`, `lightning`, `metal`, `normal`, `shadow`, `sky`, `venom`, `water`, `wood`).
- `upstream/mods/tuxemon/db/monster/<slug>.json` — monster JSON containing the fields we need (`txmn_id`, `category`, `weight`, `height`, `shape`, `types`, `evolutions`, plus `<slug>_description` / `cat_<species>` translation keys in `base.po`).
- `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po` — labels: `monster_menu_type`, `monster_menu_shape`, `monster_menu_species`, `no_evolution`, `yes_evolution`, `yes_evolutions`. Per-monster keys: `cat_<species>` (e.g. `cat_gumnut` → "Gumnut Species"), `<slug>_description`.

### What to build

1. **Extend the monster data schema**
   - `src/game/data/monsters.ts` currently has `slug`, `name`, `types`, `baseStats`, `baseXpYield`, `catchRate`, `moveset`, `evolutions`. Add optional fields used by the viewer:
     - `txmnId: number` — corresponds to upstream's `txmn_id`. Port from upstream JSONs.
     - `species: string` — short word matching `cat_<species>` key (e.g. `"gumnut"` for Lambert).
     - `shape: "sprite" | "blob" | "varmint" | "polliwog" | "brute" | "serpent" | "humanoid"` — upstream has a fixed enum. Enumerate from upstream JSONs / DB.
     - `heightCm: number`, `weightKg: number` — copied verbatim from upstream JSONs.
     - `description: string` — short paragraph displayed on the screen. Sourced from the `<slug>_description` msgid (so this could just be a translation key; or store the raw English here and key it later — implementer's call).
     - `evolutionChain: string[]` (optional) — the list of slugs in the line, in evolution order. Derivable from `evolutions: [{species, level}]` by walking forwards and backwards; cache here or derive at runtime — implementer's call, document the choice.
   - Make these fields optional on the type so we don't have to fill every monster in this story. **Fill them in for the 5 paper-town bin monsters** (`rockitten`, `lambert`, `nut`, `tweesher`, `agnite`) by reading the upstream JSON and PO file. Other monsters can show "—" or be hidden in any missing field.

2. **Port the assets**
   - Copy `upstream/mods/tuxemon/gfx/ui/background/tux_info.png` to `public/assets/ui/background/tux_info.png`. Note the upstream tree also has `tux_info_240.png` (hi-res) — port whichever resolution matches our game's render size.
   - Copy all 14 `<type>_type_small.png` element icons from `upstream/mods/tuxemon/gfx/ui/icons/element/` to `public/assets/ui/icons/element/`. Use `cmp` to verify byte equality per `[[feedback_sprite_byte_compare]]`.

3. **Port description + species + body-type l10n strings**
   - Append to `public/assets/l10n/en_US.po`:
     - Labels: `monster_menu_type`, `monster_menu_shape`, `monster_menu_species`, `no_evolution`, `yes_evolution`, `yes_evolutions`.
     - For each of the 5 bin monsters: `<slug>_description` and `cat_<species>` (e.g. `cat_gumnut`).
     - Type names if not already present: `aether`, `cosmic`, `earth`, `fire`, `frost`, `heroic`, `lightning`, `metal`, `normal`, `shadow`, `sky`, `venom`, `water`, `wood`.
     - Body-type names: `sprite`, `blob`, `varmint`, `polliwog`, `brute`, `serpent`, `humanoid`.

4. **Build the `MonsterInfoScene`**
   - New Phaser scene at `src/game/scenes/MonsterInfoScene.ts`. The existing `src/game/scenes/JournalScene.ts` (list view) can either be kept for the in-game journal menu or removed if dead — that's a separate decision. This story only adds the new detail scene.
   - Background: `tux_info.png` covering the screen.
   - Top-left: a small Pokéball-ish icon (upstream uses a tuxeball outline at this position). Use our existing `tuxeball` sprite if available (`public/assets/items/tuxeball.png` or check `sprites_obj/tuxeball.png`); otherwise port from upstream.
   - Center-left: striped frame with the monster's front sprite (64×64 region of the monster's `frontSheet`). The frame and stripes come from the background image, so just place the sprite at the right pixel offset.
   - Right column: `ID: <txmnId>`, `<NAME>` (uppercase), `<Species> Species` (translated via `cat_<species>`), `<height> cm <weight> kg`, `Type(s):` row with one or two icons + names, `Body Type: <shape>`.
   - Bottom panel: `<description>` (wordwrapped), blank line, `Evolution` label, then a list of monster names in the chain (uppercase). If no evolutions, the upstream label is `no_evolution`.
   - Input: B / ESC / BACK closes the scene and pops back to the previous scene. LEFT/RIGHT cycling between caught monsters is **not required** for this story — the bin flow only shows one monster at a time and exits.

5. **Update `open_journal` event action**
   - `src/game/event/actions/openJournal.ts` currently launches `JournalScene` (the list view). Change it to:
     - Mark the monster as seen via `markSeen()` (preserve current behavior).
     - Launch `MonsterInfoScene` with the slug as a scene-data param.
     - Pause the calling scene until the info screen is closed, so the event action's `done` flag flips only when the player closes the journal — matches upstream's `update` loop checking `if "JournalInfoState" not in active_state_names`.
   - **Don't break the existing list-view JournalScene** if other code (debug menu, etc.) launches it directly. If nothing references it after this change, remove it per `[[feedback_dead_code]]`. Check via `grep -r "JournalScene" src/`.

### Engine notes

- The "Pause the calling scene" pattern: launching a new scene and pausing the caller is a Phaser idiom — see how `BattleScene` is entered from `OverworldScene` for a reference implementation in this codebase.
- The bin events in STORY-0196 will use `open_journal <slug>` followed by `translated_dialog` and `translated_dialog_choice` — so the event runner needs to wait for the journal scene to close before advancing the action queue. If our runner doesn't currently support this, fix it here, since this is the first such use case.

### Keep `setupGame()` working

`setupGame()` doesn't touch the journal. Existing QA scripts that call `open_journal` (search `qa/` — there may be none) should keep working. Search for any debug calls to the old `JournalScene` and update or remove.

### QA Validation

Use `/puppeteer`. Add `qa/monster-info-viewer-test.ts`:

1. Launch + `setupGame({ map: "spyder_paper_town", tileX: 22, tileY: 9 })` (or any safe map).
2. Programmatically fire `open_journal lambert` via `window.A` debug bridge (or by triggering an event manually).
3. Verify `MonsterInfoScene` becomes the active scene.
4. Screenshot. Diff against the reference: `/home/jake/Pictures/Screenshots/20260520_133200.png`.
5. Verify fields render: `ID: 10`, `LAMBERT`, `Gumnut Species`, `69.0 cm 37.0 kg`, `Type(s) Wood` with leaf icon, `Body Type: Sprite`, description text "It is placed in its nut by its parent, who then sends it into the world.", `Evolution` heading, `LEGKO`.
6. Press B / ESC. Verify scene closes and the overworld scene is active again.
7. Verify the calling event action completes — chain `open_journal lambert` with a follow-up `translated_dialog` and confirm the dialog appears after the journal closes, not during.

## Acceptance Criteria

- [ ] `MonsterDef` type extended with optional `txmnId`, `species`, `shape`, `heightCm`, `weightKg`, `description` fields
- [ ] 5 bin monsters (`rockitten`, `lambert`, `nut`, `tweesher`, `agnite`) have all viewer fields populated from upstream JSONs
- [ ] `tux_info.png` background ported to `public/assets/ui/background/`
- [ ] All 14 element-type icons ported byte-identical to `public/assets/ui/icons/element/`
- [ ] L10n strings ported: labels, body types, type names, plus `cat_<species>` and `<slug>_description` for the 5 bin monsters
- [ ] `MonsterInfoScene` renders the full upstream layout (see screenshot)
- [ ] `open_journal` action pushes `MonsterInfoScene` and waits for it to close before completing
- [ ] Old list-view `JournalScene` removed if dead, or kept with explicit justification
- [ ] `qa/monster-info-viewer-test.ts` passes; screenshot diff matches reference
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
