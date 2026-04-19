# Todo: Full Campaign Playthrough QA

## What

Create an automated Playwright test that walks through the entire Spyder campaign from bedroom to Data Center, verifying every map loads, every transition works, key NPCs are interactable, and battles function at every stage.

## Why

With 80+ maps and hundreds of events, manual QA is impractical. An automated playthrough test ensures nothing is broken and serves as a regression test for future changes. This is the capstone validation that the full campaign works end-to-end.

## Implementation

1. **Create a Playwright test file** (`qa/campaign-playthrough.spec.ts` or similar):
   - Use the debug API (`A.teleport`, `A.walkTo`, `A.interact`, `A.selectChoice`, etc.)
   - Walk through the campaign in sequence, testing each region

2. **Test structure** -- for each area:
   ```typescript
   // Teleport to area
   await page.evaluate(() => A.teleport("spyder_paper_town", 10, 8));
   await page.evaluate(() => A.waitForIdle());
   
   // Verify map loaded
   const state = await page.evaluate(() => A.getState());
   expect(state.currentMap).toBe("spyder_paper_town");
   
   // Walk to NPC and interact
   await page.evaluate(() => A.walkTo(12, 6));
   await page.evaluate(() => A.interact());
   await page.evaluate(() => A.waitForEvent("dialog_opened"));
   
   // Take screenshot for visual verification
   await page.screenshot({ path: "screenshots/paper_town.png" });
   ```

3. **Campaign path to test**:
   - Bedroom → Downstairs → Paper Town
   - Paper Scoop (starter selection)
   - Route 1 → Cotton Town
   - Cotton Scoop (buy items) → Healing Center
   - Route 2 → City Park → Route 3 → Mansion (all floors)
   - Route 4 → Timber Town → Route A
   - Route 5 → Route 6 → Leather Town (gym, museum)
   - Flower City → Dojo (all floors)
   - Candy Town → Port (fast travel test)
   - Greenwash (flashback test)
   - Cotton Tunnel → Dragon's Cave / Dryad's Grove
   - Nimrod (all floors, flashback test)
   - Data Center

4. **Per-area checks**:
   - Map loads without errors
   - At least one NPC can be interacted with
   - Edge transitions to adjacent areas work
   - Wild encounters trigger in grass areas (use `setEncounterRate(1.0)` for guaranteed encounters)
   - At least one battle completes successfully per region

5. **Screenshot gallery**: Save screenshots of each area for visual regression testing.

## Verify with Puppeteer

This todo IS the puppeteer verification. Run the full test suite:
1. Execute the campaign playthrough test
2. Review all screenshots
3. Check for any failures or missing transitions
4. Fix any issues found

## Done When

- Automated test walks through the entire campaign (can skip combat with debug API)
- Every map in the campaign is visited and verified loadable
- Every inter-map transition is tested
- At least one NPC interaction per town is tested
- Test generates a screenshot gallery of the complete world
- Test passes as part of `npx playwright test`
- No crashes, no missing maps, no broken transitions
