# STORY-0202: Combat menu — 3-panel layout with attack info card

## Description

Restructure the combat scene's bottom UI to match the layout used by upstream Tuxemon. The reference screenshot lives next to this story at `upstream-combat-ui.png` — that is the visual target.

Today our bottom UI is two panels: a left "message" panel and a right "main menu" panel. When the player picks FIGHT, the techniques **replace** the main menu inside the right panel, and the left panel just says "Choose a technique:".

Upstream uses **three** simultaneous panels when in technique selection:

- **Bottom-right**: the 2×2 main menu (FIGHT / ITEM / TUXEMON / FORFEIT), still visible (the non-active items dimmed)
- **Top-right** (floating just above the main menu): a small popup listing the current monster's techniques with a cursor
- **Bottom-left**: an **attack info card** showing details of the currently-highlighted technique — accuracy, power, recharge/cost, range badge, element

This story is the **structural** half of the work: get the three panels into the right shape and wired up, with the info card displaying **text-only** content. Icon artwork (element icons, range badge artwork) is intentionally deferred to STORY-0203 so this story stays focused on layout and state management.

Currently relevant code: `src/game/scenes/CombatScene.ts` — see `setMenuMode`, `buildTechLabels`, `MAIN_MENU_ITEMS`, the `leftBorder` / `rightBorder` nine-slice panels, and `confirmMainMenu`.

Upstream reference: `upstream/tuxemon/states/combat_menus.py` — `MainCombatMenuState.open_technique_menu` (around line 350), particularly the `show()` closure that renders the info overlay when selection changes.

## Visual target

See `upstream-combat-ui.png` in this story's directory. Specifically, the bottom half showing Ignibus selecting an attack:

- Top-right popup: "Sting / Blossom / Poison Courtship" with a `▶` cursor next to the selected entry
- Bottom-right: 2×2 main menu where FIGHT row is highlighted with a cursor, and TUXEMON / FORFEIT are still drawn but dimmed
- Bottom-left: info card with "Accuracy 85%", a "RANGED" pill, "Power 15", "Recharge 2 turns", and a small element icon (deferred to STORY-0203 — for now this story just gets the text into the right places)

## Mapping upstream fields to ours

Our `TechniqueDef` already has `element`, `range`, `accuracy`, and `dpCost`. We do not have an explicit "recharge" turns mechanic — `dpCost` is our analogue. For text labels in this story:

- `Accuracy XX%` — from `accuracy` (multiply by 100, round)
- `Power X` — from the first `{ kind: "damage", power }` effect if any (else hide the line)
- `Cost X DP` — from `dpCost` (this stands in for upstream's "Recharge N turns")
- `MELEE` / `RANGED` — from `range` (rendered as plain text in this story; the badge artwork comes in STORY-0203)

If the technique has no damage effect (e.g. Growl, Harden), the Power line should be hidden rather than showing "Power 0".

## Todos

Work through these in order. Each can be a separate commit. After every todo, screenshot via puppeteer and visually diff against `upstream-combat-ui.png`.

1. [Three-panel layout shell](todos/open/01-three-panel-shell.md) — split the bottom area into the three regions and add a separate `techPopupBorder` nine-slice
2. [Keep main menu visible during technique selection](todos/open/02-main-menu-stays-visible.md) — dim non-selectable items rather than hiding the whole panel
3. [Build the techniques popup as its own panel](todos/open/03-tech-popup-panel.md) — size to fit N techniques, cursor on left, position above main menu
4. [Attack info card — text content](todos/open/04-attack-info-text.md) — render accuracy, power, cost, and range label in the bottom-left panel
5. [Re-render info card on cursor move](todos/open/05-info-card-on-cursor-change.md) — when `techSelected` changes, refresh the card
6. [Wire keyboard + debug navigation](todos/open/06-wire-navigation.md) — preserve back/forward, `debugSelectChoice`, and the existing `combat_menu` debug events
7. [Puppeteer QA](todos/open/07-puppeteer-qa.md) — open a battle, pick FIGHT, screenshot in each menu state, side-by-side diff vs `upstream-combat-ui.png`

## Acceptance criteria

- [ ] When the player picks FIGHT, the main menu remains visible (dimmed) on the bottom-right
- [ ] A separate technique-popup panel appears above the main menu, listing the current monster's techniques with a cursor
- [ ] The bottom-left panel shows an info card with `Accuracy XX%`, `Power X` (hidden when 0), `Cost X DP`, and the range label as text
- [ ] Moving the cursor in the techniques popup updates the info card immediately
- [ ] ESC / X / Backspace returns from technique selection to the main menu, restoring the "What will X do?" prompt in the bottom-left
- [ ] All existing combat keyboard shortcuts still work; the `debugSelectChoice` path for `techniques` mode still works
- [ ] All code passes `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
- [ ] Puppeteer screenshot of the FIGHT submenu visibly matches the structural layout of `upstream-combat-ui.png` (icon artwork still pending in STORY-0203)
