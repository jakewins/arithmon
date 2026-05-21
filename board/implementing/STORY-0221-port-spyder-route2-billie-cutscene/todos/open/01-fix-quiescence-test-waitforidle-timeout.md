# Todo: Fix `testNoEncountersOrNpcs` waitForIdle timeout in cotton-town-east-road-test.ts

`qa/cotton-town-east-road-test.ts` fails on the `testNoEncountersOrNpcs` case with
`waitForIdle timed out`. This test was passing in STORY-0217 (when route2 had no trainer
NPCs), then broke in STORY-0218 when Roddick, Marion, and Graf were added. STORY-0221
touched this file in four places but did not address this case.

## Root cause

The test spawns at `(5, 8)`. Roddick's create event places him at `(5, 3)` facing south;
he sight-lines the player, walks south to `(5, 7)`, and the engine stays blocked
(presumably waiting for a sight-line action to complete or Roddick to finish his
approach). `waitForIdle` never resolves.

## Steps to fix

1. In `testNoEncountersOrNpcs`, change the `setupGame` call to spawn away from Roddick's
   column — e.g. `tileX: 15, tileY: 12` (open grass in the middle of the map, well clear
   of all three trainer sight-lines and the Billie trigger column). Add `variables:
   { route2billie: "yes" }` as well to stay consistent with the other cases in this file.
2. Update the comment above the `setupGame` call to note both guards: away from Billie's
   trigger column *and* away from trainer sight-lines.
3. Re-run the full `cotton-town-east-road-test.ts` suite and confirm all cases pass,
   including `testNoEncountersOrNpcs`.
4. Run pre-commit gates (`npm run format:check && npm run lint && npx tsc --noEmit && npm test`).
