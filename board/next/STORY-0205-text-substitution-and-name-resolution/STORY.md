# STORY-0205: Text interpolation + slug-to-name resolution for user-visible dialogue

## Description

Two user-visible bugs surface in the very first minutes of the game; both are symptoms of the same missing piece (a generic upstream-style text formatter). Fix the **general** mechanism, not just the two reported spots.

### Symptom A — `${{name}}` rendered literally

Talk to the homemaker NPC south of the player's house in `spyder_paper_town`:

> How are you, ${{name}}?
> Quiet and solemn as always, I see.

The text is from `msgid spyder_papertown_homemaker1` in `public/assets/l10n/en_US.po:11913-11916`. The .po stores `${{name}}` as the placeholder; nothing in the engine substitutes it.

This is **not** an isolated string. `grep -c '\${{' public/assets/l10n/en_US.po` returns **82** placeholders, including: `${{name}}`, `${{NAME}}`, `${{today}}`, `${{money_formatted}}`, `${{map_name}}` (+ `north/south/east/west`), `${{monster_0_name}}`, `${{monster_0_level}}`, `${{var:<key>}}`. Any line ported from upstream that mentions the player by name will be broken until we add a real formatter.

### Symptom B — trainer name shows the raw slug

Pick a starter, then lose to / beat Billie in the My-First-Mon battle. The end-of-battle message reads `You defeated spyder_billie!` instead of `You defeated Billie!`.

Source: `src/game/event/actions/startBattle.ts:54-66`. When the NPC has a *dynamic* party (set via `add_monster billie_choice,...`) but no entry in `src/game/data/npcParties.ts` (the static registry), `trainerName` falls back to `this.npcSlug`. Billie has no static `NPC_PARTIES` entry — only `name` lookups in static defs work — so the slug leaks through.

Note: the .po does carry a translation for the NPC slug — `msgid "spyder_billie" → "Billie"` at line 15367. So the engine has everything it needs; it just isn't routed through `t()`.

Same pattern likely affects the `Trainer X wants to battle!` and `X sent out Y!` lines in `src/game/combat/machine.ts:113-114, 285-286` whenever the same dynamic-party-no-static-def case applies.

### Where the upstream solution lives

`upstream/tuxemon/ui/text_formatter.py` is the reference. It builds a `placeholder → lambda` map (`${{name}}`, `${{NAME}}`, `${{money}}`, `${{money_formatted}}`, `${{today}}`, `${{map_name}}`, `${{north/south/east/west}}`, `${{monster_<N>_<attr>}}`, `${{var:<key>}}`, `${{msgid:<key>}}`, and unit/measure variants), then does a straight substring replace pass on the translated string.

### Where our pipeline is wired today

- `src/game/i18n.ts` — `t(key)` is a raw `Map<string,string>` lookup. **No** post-substitution.
- `src/game/event/actions/translatedDialog.ts:20` — calls `t(this.key)`, passes the result straight to `DialogBox`. This is the path the homemaker hits.
- `src/game/event/actions/translatedDialogChoice.ts:65,112,131` — same: raw `t()` into UI.
- `src/game/event/actions/dialog.ts:18-21` — has its own ad-hoc substitution: `$player` for the player name, and `${{var}}` resolved against **game variables only** (so `${{name}}` returns the literal `"name"` from the fallback). This is the divergence that hid the bug from the simpler dialog path.
- `src/game/scenes/MonsterInfoScene.ts:188-269` — `t()` results flow into the UI uninterpolated.
- `src/game/event/actions/startBattle.ts:51-66` — slug fallback for `trainerName`; never goes through `t()`.
- `src/game/combat/machine.ts:113-114, 285-286` and `src/game/scenes/CombatScene.ts:1803-1810` — consumers of `trainerName`; if A is fixed properly they need no change.

### What to build

1. **New module: `src/game/textFormatter.ts`** (or similar) exporting `formatText(text: string): string`. It must:
   - Substitute the placeholder set actually used in our `en_US.po` (find them with `grep -oh '\${{[^}]*}}' public/assets/l10n/en_US.po | sort -u`). Today that's: `${{name}}`, `${{NAME}}`, `${{today}}`, `${{money_formatted}}`, `${{currency}}`, `${{map_name}}`, `${{map_desc}}`, `${{north/south/east/west}}`, `${{monster_0_name}}`, `${{monster_0_level}}`, `${{var:<key>}}`. Implement the ones we have data for; leave a clear `// TODO` and a single console warning per unknown placeholder for anything we *don't* yet have a backing field for, so future omissions are visible.
   - Pull values from `session.player.name`, `session.player.money` (with a small currency formatter), `session.player.monsters[N]`, `session.player.gameVariables`. Map name comes from current overworld map; see `OverworldScene` for the right accessor (don't introduce a circular import — `textFormatter` should depend only on `session` + a tiny lookup the OverworldScene registers, or read from a shared map-state module).
   - Be a pure function over current `session` state; no Phaser/UI imports. That makes it cheap to unit-test.
2. **Wire it through every translated-text exit:**
   - `translatedDialog.ts` and `translatedDialogChoice.ts` — apply `formatText(t(key))` instead of `t(key)`.
   - `dialog.ts` — replace the ad-hoc `$player` / `${{var}}` block with `formatText(text)` so the two dialog actions behave identically. Confirm no existing event relies on the old `${{var}}=game-variable` shortcut (if any do, `${{var:<key>}}` is the new spelling and the events should be migrated; otherwise drop the legacy path per [[feedback_dead_code]]).
   - `MonsterInfoScene.ts` — any `t(...)` whose result is shown to the user should go through `formatText` (most monster info text is parameter-free, but the description and category strings can contain placeholders).
3. **Slug → display name for NPCs in combat:**
   - In `startBattle.ts`, change the fallback chain to `partyDef?.name ?? t(this.npcSlug)` — if the .po has a translation for the slug, use it; if it doesn't, fall through to the slug as today (so the warning is still visible). Update the surrounding logic so the same lookup applies to both the dynamic-party and static branches uniformly.
   - Audit `src/game/combat/machine.ts` and `CombatScene.ts` for any other place we display a slug we should be displaying a name (e.g. monster slugs in battle log, item slugs). Fix what you find; document in `JOURNAL.md` what you did and did not change.
4. **Static `NPC_PARTIES` entry for Billie.** Independently of the slug fix, Billie's first battle is part of the canonical intro. Add her to `npcParties.ts` so the dynamic-party path isn't load-bearing for a scripted, deterministic fight. The party is what `add_monster billie_choice,5,spyder_billie,5,10` produces — i.e. one copy of whatever the player **didn't** pick at the scoop, at L5. If the static def can't express "depends on game var", leave the dynamic path in place but verify the slug-to-name fix renders correctly. Decide and explain in `JOURNAL.md`.

### Unit tests

`src/__tests__/textFormatter.test.ts` (new), covering at minimum:
- `${{name}}` and `${{NAME}}` substitute player name (case-correct).
- `${{var:foo}}` substitutes from `gameVariables`; missing keys leave a placeholder + warn.
- `${{monster_0_name}}` resolves to first party monster's name; missing monster leaves placeholder + warn.
- `${{money_formatted}}` formats correctly.
- Strings with no placeholders pass through unchanged.
- Multiple placeholders in one string all resolve.

### QA Validation

Add `qa/text-substitution.ts` (checked in). It must, against the running dev server:

1. Land post-intro with a named player (use `setupGame` and set `player.name = "Test"` explicitly — confirm `setupGame` does this; if not, add an option).
2. Walk to the homemaker NPC at (25,7) in `spyder_paper_town` and trigger their dialog.
3. **Screenshot** the dialog box and assert the rendered text contains `"How are you, Test?"` — **no literal `${{name}}`**. Reference the screenshot path in `JOURNAL.md`.
4. Force a battle vs `spyder_billie` (use the debug bridge / `setupGame` to land at the first-fight tile with the appropriate vars set), win it (debug force-win), and **screenshot** the end-of-battle message. Assert it contains `"You defeated Billie!"`, **not** `"You defeated spyder_billie!"`.
5. As a smoke check for the broader fix: grep every translated `msgid` we actually use in events for `${{` and pick 2–3 additional spots that will exercise different placeholder types (`${{map_name}}`, `${{var:...}}`, a monster placeholder). Drive the player to them and assert no literal `${{` survives in the rendered text.

The implementing agent **MUST verify both Symptom A and Symptom B by screenshot in a real browser before flipping the story to `reviewing/`**. The previous combat-recharge story showed that running tests alone is not enough.

## Acceptance Criteria

- [ ] `src/game/textFormatter.ts` exists with `formatText()` covering every placeholder used in `public/assets/l10n/en_US.po`
- [ ] `translatedDialog`, `translatedDialogChoice`, and `dialog` event actions all route translated text through `formatText`; the ad-hoc substitution in `dialog.ts` is removed (or its only legitimate behavior is folded into the new formatter)
- [ ] `start_battle` resolves NPC display names via `t(slug)` before falling back to the raw slug; `CombatScene` end-of-battle and intro messages render the localized name
- [ ] Billie has a deterministic static `NPC_PARTIES` entry **or** the dynamic path is documented as load-bearing in `JOURNAL.md` with a clear reason
- [ ] Unit tests in `src/__tests__/textFormatter.test.ts` cover the placeholder set, missing-key fallback, and multi-placeholder strings
- [ ] `qa/text-substitution.ts` exists, is checked in, runs end-to-end, and screenshots **both** the homemaker dialog and the Billie defeat message; screenshots referenced in `JOURNAL.md`
- [ ] No literal `${{` survives in the rendered text for any dialog walked by the QA script
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
