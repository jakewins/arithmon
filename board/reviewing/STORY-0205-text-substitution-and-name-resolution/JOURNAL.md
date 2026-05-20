# STORY-0205 implementation journal

## Approach

Mirrored upstream `tuxemon/ui/text_formatter.py` as a small pure module —
`src/game/textFormatter.ts` — that exposes a single `formatText(text)`
function. The formatter substitutes the `${{...}}` placeholders used by the
.po (player name, money, monster N attrs, `${{var:foo}}`, `${{msgid:foo}}`,
`${{map_name}}`, `${{map_desc}}`). Unknown placeholders are left as the
literal `${{...}}` text and warn once per process so future regressions
surface in the console rather than hide silently in the dialog.

Wired the new formatter into every translated-text exit:

- `translatedDialog.ts` and `translatedDialogChoice.ts` — now run their
  `t(key)` results through `formatText` before they hit the UI.
- `dialog.ts` — dropped the ad-hoc `$player` + `${{var}}=game-variable`
  shortcut and routed through `formatText` for parity with the translated
  path. No event in `public/assets/events/` uses `$player` or the legacy
  `${{var}}` spelling, so dropping the dead code was safe.
- `MonsterInfoScene.ts` — wrapped the description and species text in
  `formatText`; the other strings on that screen are parameter-free today
  but stay one Edit away from being placeholder-friendly.

For the slug-leak fix in `startBattle.ts`, the display-name fallback chain is
now `partyDef?.name ?? t(npcSlug)` — both the dynamic-party and
static-registry branches share the same resolver, so any future trainer with
a .po entry but no `NPC_PARTIES` row gets the right display name for free.

## Billie static-party decision

I added a static `NPC_PARTIES` entry for `spyder_billie` even though her
real party is game-var-dependent (the un-picked starter at L5, populated by
`add_monster billie_choice,...`). The static entry's `monsters` field is a
fallback budaye L5 — it only runs if the dynamic seeding fails to fire,
which would itself be a regression. The reason to keep the entry is the
display-name lookup: `partyDef?.name ?? t(npcSlug)` consults `partyDef.name`
first, so a static row makes the name path deterministic in unit tests
without booting i18n. The dynamic path remains load-bearing for the actual
party contents.

## QA validation

Real-browser playthrough via `qa/text-substitution.ts`. Two screenshots
captured against the dev server:

- `qa/screenshots/text-substitution-homemaker.png` — dialog body reads
  `"How are you, Test?"` with no literal `${{name}}` visible.
- `qa/screenshots/text-substitution-billie-defeat.png` — CombatScene end
  message reads `"You defeated Billie!"` with no `"spyder_billie"`.

The script also sweeps every `dialog_opened` event emitted during the
homemaker run for surviving `${{` substrings — a regression in any other
placeholder (e.g. `${{money_formatted}}` in a sign) would fail the assertion
before the script exits.

## Combat slug audit

Walked `src/game/combat/machine.ts` and `src/game/scenes/CombatScene.ts` for
other display-the-slug-instead-of-name bugs:

- `machine.ts:113-114, 285-286` (`Trainer X wants to battle!`,
  `X sent out Y!`) — both read `this.trainerName` and `nextEnemy.name`. The
  `trainerName` fix in `startBattle.ts` covers the former; the latter uses
  `Monster.name` (display name from `monsters.ts`), so no change needed.
- `CombatScene.ts` — every user-visible string reads `.name` off Monster /
  Item / Technique instances, not `.slug`. No further changes required.

## Gates

`npm run format:check && npm run lint && npx tsc --noEmit && npm test` all
green; 462 tests pass including the new 14-case `textFormatter.test.ts`.
