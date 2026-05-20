# Todo: Puppeteer QA — side-by-side vs upstream

## What

Use the puppeteer harness (`qa/harness.ts` + the `setupGame` helper) to spawn a battle, walk through each menu state, and capture screenshots. Compare the screenshots side-by-side with `../../upstream-combat-ui.png` and confirm the structural layout matches.

## Why

The whole point of this story is visual fidelity to the upstream screenshot. The acceptance criteria explicitly call for the structural layout to match. This is where we prove it.

## Implementation

Add a one-off QA script under `qa/local/` (gitignored, per `CLAUDE.md`) that:

1. Calls `launchGame()` and `setupGame()` (see `CLAUDE.md` — always use these)
2. Uses the debug bridge to spawn a battle directly via the existing `spawnBattle` debug command if available (otherwise walk into one)
3. Sends keypresses (or uses `debugSelectChoice`) to enter the FIGHT submenu
4. Screenshots:
   - The main menu state (cursor on FIGHT)
   - Technique selection with cursor on technique #1
   - Technique selection with cursor on a non-damage move (e.g. Growl) — confirms Power line hides correctly
   - Technique selection with cursor on the RECHARGE row — confirms info card hides
   - Back to main menu (after pressing ESC)
5. Drops the screenshots next to the script

Then visually compare each screenshot against `../../upstream-combat-ui.png` and report the diff.

## Verification

- The technique-selection screenshot has the same panel layout as upstream's screenshot: small popup top-right, 2×2 main menu bottom-right (dimmed), info card bottom-left
- The info card shows the right text fields for each technique
- The RECHARGE-row screenshot shows the recharge prompt, not the info card
- Note any pixel-level differences in panel size/position as follow-ups for STORY-0203 or a polish pass — don't block this story on them as long as the structure is right
