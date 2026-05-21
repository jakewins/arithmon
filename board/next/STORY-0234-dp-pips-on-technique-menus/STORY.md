# STORY-0234: Show technique DP cost as purple pips

## Description

In the combat scene, replace the `"<N>DP"` text on a technique's row in the
technique-choice popup and the `"Cost N DP"` row in the technique-details
info card with N filled purple pips, reusing the same pip visual (size,
colour, spacing) that the player-HUD already uses to show remaining Dark
Power. In the technique-choice popup the pips are drawn right-aligned
inside each row (so long move names can't collide with them). In the
technique-details info card the pips sit in the top-right corner of the
left bottom panel. Filled pips only — no empty / outlined pips, unlike the
HUD's remaining-DP display which shows filled + empty. Existing padding /
margins of both surfaces must be preserved; pips fit inside the boxes, not
flush against any edge.

Arithmon-specific UI polish — Dark Power is our mechanic, not upstream's,
so there is no upstream reference to follow.

## Context

- Combat scene: `src/game/scenes/CombatScene.ts`.
  - **Technique-choice popup label** is built in `buildTechLabels()` at
    `src/game/scenes/CombatScene.ts:1022-1094`. The DP suffix is added to
    each row's label string at line `1060`
    (`` `${tech.name} ${tech.dpCost}DP` ``) and the popup width is sized
    against the same template at line `1032`. The popup uses a nine-slice
    border `techPopupBorder` (built around line `577`). Row geometry:
    `techPopupOriginX` is the row's text origin (left padding + 8 px
    cursor gutter, set at line `1050`); the popup's right edge is
    `popupX + popupW` and equals `WIDTH` (`1042-1043`). The right padding
    inside the box is `PAD_X` (= 4 px, line `68`); pips should be inset
    from `popupX + popupW - PAD_X` and grown leftward.
  - **Technique-details info card** lives in the bottom-left panel and is
    populated by `renderInfoCard(tech)` at
    `src/game/scenes/CombatScene.ts:1160-1198`. The DP-cost row is line
    `1189` (`` `Cost ${tech.dpCost} DP` ``), drawn via the
    `infoCardCost` `Phaser.GameObjects.Text` created at lines `619-620`
    (positioned at `infoX + 0, infoY + infoRowH * 3`, the bottom row of
    the card). The card is also hidden in `renderInfoCard(null)` at line
    `1165`. Box geometry: left border is `leftBorder` (`544-556`); its
    interior top-right corner is at `(LEFT_W - PAD_X, BOX_Y + PAD_Y)`.
- **Existing pip widget**: `src/game/scenes/CombatScene.ts:512-537`
  (the "Dark Power pips" block under the player HUD). The pip is a
  `Phaser.GameObjects.Rectangle` filled `0xbb66ff` with a `1 px` stroke
  `0x8833cc`, sized `DP_PIP_SIZE = 4` px (line `27`) and spaced
  `DP_PIP_GAP = 1` px (line `28`). The HUD draws `MAX_DARK_POWER = 5`
  pips and toggles their fill colour in `updateDpPips()` at line `1532`
  (filled `0xbb66ff`, empty `0x332244`) — for this story we only ever
  emit the filled variant.
- **DP-cost field**: `TechniqueDef.dpCost: number` defined at
  `src/game/data/techniques.ts:18`. All current techniques (audited in
  `src/game/data/techniques.ts`) have `dpCost` in the range **1..5**
  (distinct values present: 1, 2, 3, 4, 5; no 0-cost moves exist today).
- The same `${tech.name} ${tech.dpCost}DP` label is also rendered on the
  monster-info portrait at `src/game/ui/monsterPortrait.ts:123`. That is a
  **different surface** (monster journal card, not combat menus) — out of
  scope for this story.

## What to build

1. **Extract a reusable filled-pip helper.** Add a small private method on
   `CombatScene`, e.g.:

   ```ts
   private drawFilledDpPips(originX: number, originY: number, count: number): Phaser.GameObjects.Rectangle[]
   ```

   It creates `count` filled rectangles using the same constants the HUD
   uses (`DP_PIP_SIZE`, `DP_PIP_GAP`, fill `0xbb66ff`, stroke `0x8833cc`,
   depth `101` for menu-layer pips), laid out left-to-right starting at
   `(originX, originY)`, and returns the array so callers can `destroy()`
   them on teardown. The HUD's own pip-construction loop in `create()`
   can keep its current code (it needs `MAX_DARK_POWER` empty/filled
   pips with separate update logic) — don't refactor it, just have the
   new helper exist alongside it. Keep the helper short; do not introduce
   a separate file.

2. **Technique-choice popup pips (right-aligned).** In `buildTechLabels()`:
   - Drop the `` `${tech.name} ${tech.dpCost}DP` `` template; render each
     row's label as just `tech.name`.
   - Update the popup-width calculation (`widestChars` loop at lines
     `1030-1034`) to use just `t.name.length` for the text width, then add
     a fixed reservation on the right for the pips:
     `maxPipsWidth = maxDpCost * (DP_PIP_SIZE + DP_PIP_GAP) - DP_PIP_GAP`
     where `maxDpCost = max(t.dpCost for t in techniques)`. Add a small
     gap (e.g. 4 px) between the text right-edge and the pip block so a
     long name doesn't visually collide with the pips.
   - After creating each row's `label` text object, call
     `drawFilledDpPips(...)` to draw `tech.dpCost` pips, right-aligned
     inside the row:
     - Row right edge: `popupX + popupW - PAD_X`.
     - Pip block width: `tech.dpCost * (DP_PIP_SIZE + DP_PIP_GAP) - DP_PIP_GAP`.
     - Pip-block left origin: `rowRight - pipBlockWidth`.
     - Vertical origin: align with the row's label baseline — the label is
       drawn at `this.techPopupOriginY + i * OPTION_H`; pip-block top
       should be the same Y plus a small vertical inset so a 4 px pip
       sits centred in the ~10 px row (e.g. `+ (OPTION_H - DP_PIP_SIZE) / 2`,
       rounded down).
   - Track the per-row pip rectangles in a new field (e.g.
     `private techPips: Phaser.GameObjects.Rectangle[] = []`) and add
     `for (const p of this.techPips) p.destroy();` + `this.techPips = []`
     to `clearTechLabels()` so they tear down with the popup.

3. **Technique-details info card pips (top-right).** In `renderInfoCard`:
   - Remove `this.infoCardCost.setText(...)` and
     `this.infoCardCost.setVisible(true)` at lines `1189-1190`, and delete
     the `infoCardCost` `Text` field + its creation at lines `619-620` and
     its setup loop entry at `630`. Also drop it from the
     `renderInfoCard(null)` hide-list at line `1165`. (Dead code — see
     project memory `feedback_dead_code.md`. Remove, don't leave behind.)
   - Add a `private infoCardPips: Phaser.GameObjects.Rectangle[] = []`
     field. In `renderInfoCard(null)` destroy them
     (`for (const p of this.infoCardPips) p.destroy(); this.infoCardPips = [];`).
     In the populated branch, after `infoCardPips.length` is cleared the
     same way, call `drawFilledDpPips(...)` with `tech.dpCost` pips
     anchored top-right inside the left bottom panel:
     - Box right edge: `LEFT_W - PAD_X`.
     - Pip-block width: `tech.dpCost * (DP_PIP_SIZE + DP_PIP_GAP) - DP_PIP_GAP`.
     - Pip-block left origin: `(LEFT_W - PAD_X) - pipBlockWidth`.
     - Top origin: `BOX_Y + PAD_Y` (matches existing `infoY`).
   - Confirm the new pips don't overlap with `infoCardName` (the name
     starts at `infoX = PAD_X`, left edge — pips are right-aligned, so as
     long as the name string fits within roughly `LEFT_W - PAD_X*2 - 5 *
     (DP_PIP_SIZE + DP_PIP_GAP) ≈ 117 px` there's no collision. All
     current technique names are well under that. If a future longer name
     pushes against the pips that's a layout adjustment for that story,
     not this one — but note the constraint as a code comment near the
     pip-draw call.)

4. **QA script.** Add `qa/local/dp-pips-menus.ts` that:
   - Launches the game and `setupGame(page, { monsters: [{ slug: "rockitten", level: 13 }] })`
     so the player party has a mixed-cost moveset (rockitten L13 learns
     `ram` 2-DP, `boulder` 2-DP, `mudslide` 4-DP, `assault` 3-DP — visible
     spread across rows).
   - Calls `window.A.spawnBattle("rockitten", "pairagrin", 13, 5, "grass")`
     and waits for `menuMode === "main"`.
   - Opens the technique popup the same way `qa/combat-layout-vs-upstream.ts:80-82`
     does (`combat.setMenuMode("techniques")`), screenshots
     `dp-pips-technique-menu`.
   - Walks the technique cursor to a 3-DP move (e.g. assault) — the info
     card refreshes on cursor move via `refreshInfoCardForTechCursor()`
     — and screenshots `dp-pips-technique-details`.
   - Repeats the details-card screenshot for a 4-DP move so the reviewer
     can compare pip counts (`dp-pips-technique-details-4dp`).

## QA Validation

Visual + light-behavioural. The puppeteer script's job is to drive the
game into the right state and capture screenshots; the reviewer makes the
visual judgement. The script can sanity-check `menuMode === "techniques"`
but does not need to count pixels.

Reviewer should run `npx tsx qa/local/dp-pips-menus.ts` and inspect the
three screenshots:

- `dp-pips-technique-menu.png` — technique popup open, each row shows N
  filled purple pips at its right edge matching that move's
  `dpCost`. No `"<N>DP"` text on any row. Pips don't touch the popup's
  right border (≥ `PAD_X` margin). Move names sit at the left of the row,
  unchanged.
- `dp-pips-technique-details.png` — technique-details info card visible
  in the bottom-left panel (cursor on a 3-DP move). Card shows 3 filled
  pips in its **top-right corner**, with the same colour/size/spacing as
  the HUD pips above the party tray. No "Cost N DP" row at the bottom of
  the card. Other rows (name, accuracy, range pill + power, element
  badge) unchanged.
- `dp-pips-technique-details-4dp.png` — same view with a 4-DP move
  selected, to confirm pip count tracks the cost.

The pip widget on the player HUD (above the party tray) must still
render unchanged — five pips, filled-or-empty by current DP. Reviewer
should sanity-check that in any of the three screenshots.

## Out of scope

- Changing pip colour, size, or spacing (must reuse exactly the HUD's
  current visual constants).
- Changes to the main-HUD "remaining DP" pip widget.
- The `${tech.name} ${tech.dpCost}DP` label on the monster-info portrait
  (`src/game/ui/monsterPortrait.ts:123`) — different surface, future
  story if needed.
- Changing any technique's `dpCost` value.
- Re-laying-out the technique-details panel beyond removing the DP row
  and adding the corner pips.

## Acceptance Criteria

- [ ] `dp-pips-technique-menu.png` shows N filled purple pips
      right-aligned on each technique row, no `<N>DP` text.
- [ ] `dp-pips-technique-details.png` shows N filled purple pips in the
      info card's top-right corner; no "Cost N DP" row at the bottom.
- [ ] `dp-pips-technique-details-4dp.png` confirms the pip count tracks
      `tech.dpCost` (different number of pips than the 3-DP screenshot).
- [ ] Existing right/top margins of both boxes preserved — pips sit
      inside the boxes, not flush against any edge.
- [ ] Pip visual (size `4`, fill `0xbb66ff`, stroke `0x8833cc`, gap `1`)
      identical to the HUD widget — sourced from the same constants
      (`DP_PIP_SIZE`, `DP_PIP_GAP`) and drawn by the new
      `drawFilledDpPips` helper used by both new sites.
- [ ] The `infoCardCost` `Text` object is fully removed (no dead
      field / creation / hide-list reference left behind).
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` pass.
