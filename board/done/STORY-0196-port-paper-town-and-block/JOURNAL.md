# STORY-0196 Journal

## 2026-05-20 — Reviewer findings (approve)

Implementor landed the full port in a single commit (`648ab72`), no split.

Validated:

- **Event coverage.** Upstream TMX has 53 `<object type="event">`; the YAML has 53 events. Diff of event-name sets vs upstream shows only the two `Teleport to Route 1` duplicates renamed to `#142`/`#143` (necessary disambiguation — YAML keys must be unique).
- **Event content (spot-checked).** Stop!, Stop 2!, My First Mon, My First Mon - Not Met, Rockitten (bin), Chosen - Rockitten, First Fight - Start/Win/Lose, Play Music, Teleport to Mart, Create Conileaf, Create Captain, Talk Captain - Candy, Destination - Candy, Talk homemaker, Environment Day — all conditions and actions match upstream verbatim, in correct order, with pixel coords divided by 16.
- **`friendship_scroll`.** Sprite at `public/assets/items/friendship_scroll.png` byte-equal to upstream `gfx/items/friendship_scroll.png`; description verbatim from `friendship_scroll_description` msgid; registered in `items.ts`. (Minor: category set to `"other"` vs upstream `none` — harmless, item is `visible: false` and only used by `add_item`.)
- **NPC data.** `spyder_billie` spritesheet = `fashionista` matches upstream `sprite_name: fashionista`. `spyder_route3_zoolander` spritesheet = `overseer` matches upstream. The static party (`elofly L9 + shybulb L10`) is irrelevant for first-fight because `add_monster billie_choice,5,spyder_billie,5,10` populates `session.npcParties` and `start_battle` reads dynamic-first.
- **L10n.** All required msgids present in `en_US.po`; spot-checked `spyder_papertown_stopthere`, `_firstfight`, `_myfirstmon1`, `friendship_scroll_description` are verbatim against upstream `base.po` (including multi-line msgstrs).
- **Engine.** `add_monster` supports multi-arg `<slug>,<level>,<npc>,<level>,<max_hp>`, resolves variable-slug fallback (`billie_choice` → "rockitten"), writes `add_monster` var for the follow-up `set_monster_attribute`. `start_battle` reads `session.npcParties` before the static registry. `transition_teleport` does case-insensitive lookup and short-circuits gracefully for unported maps. `play_music`/`music_playing` track via `session.musicPlaying`. `open_journal` hooks shutdown + the "modal seen active first" guard. `OverworldScene.update` resolves pending walkTo/walkStep promises when a cutscene grabs control.
- **Pre-commit gates.** All clean: `format:check`, `lint`, `tsc --noEmit`, `vitest` (41 files / 447 tests pass).
- **New QA scripts.** All three pass on port 8082:
  - `qa/paper-town-blockers-test.ts` — blocker fires + suppresses with party
  - `qa/paper-town-bins-test.ts` — my-first-mon → bin-pick → first-fight (through Billie talk)
  - `qa/paper-town-buildings-test.ts` — mart teleport + 4 unported-target teleports (graceful)
- **Existing QA.** All pass unchanged: smoke, title-screen-test, bedroom-intro-test, character-creation-test, paper-scoop-intro-test, paper-scoop-talk-dante-test, monster-info-viewer-test, spyder-downstairs-test, shop-purchase-test.

Approved. Moving to `board/done/`.
