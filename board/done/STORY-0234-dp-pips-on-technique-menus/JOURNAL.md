# STORY-0234 — Implementation Journal

## 2026-05-21 — Reviewer findings (approved)

### What was validated

- Pre-commit gates re-run in the reviewer worktree: `format:check`, `lint`,
  `npx tsc --noEmit`, and `vitest run` all pass (43 test files, 490 tests).

- Code review: clean, minimal change — 82 insertions / 20 deletions in
  `CombatScene.ts` only.
  - `drawFilledDpPips(originX, originY, count)` is a clean private helper,
    well-commented, correctly reuses `DP_PIP_SIZE` / `DP_PIP_GAP` and the
    HUD's fill/stroke colours. Pip x-centering uses `+ DP_PIP_SIZE / 2`
    which matches Phaser's rectangle origin-at-centre convention — correct.
  - `techPips: Rectangle[]` field and teardown in `clearTechLabels()` are
    correct; pips are destroyed alongside their labels.
  - `infoCardPips: Rectangle[]` field: teardown happens at the top of
    `renderInfoCard` (both null and populated branches), so re-entering the
    technique menu never leaks pips — correct.
  - `infoCardCost` `Text` object fully removed: field declaration, creation,
    setup-loop entry, and hide-list reference are all gone. No dead code left.
  - Popup width calculation updated correctly: `widestChars` now counts only
    `t.name.length`, then adds `maxPipsWidth + PIP_TEXT_GAP` reservation so a
    long name doesn't collide with the pip block.
  - Layout comment documenting the name-collision constraint (`LEFT_W -
    PAD_X*2 - 5*(DP_PIP_SIZE+DP_PIP_GAP) ≈ 117 px`) included as requested.

- QA script (`qa/local/dp-pips-menus.ts`) written and run against port 8082.
  Three screenshots captured:
  - `dp-pips-technique-menu.png`: technique popup open with rockitten L13
    (Ram 2-DP, Boulder 2-DP, Mudslide 4-DP, Assault 3-DP, Thunderball 4-DP).
    Each row shows the correct N filled purple pips right-aligned; no `<N>DP`
    text on any row; pips sit inside the popup border with visible margin;
    move names unchanged at left edge. Player HUD renders 5 empty pips (no
    DP, full HUD intact).
  - `dp-pips-technique-details.png`: info card for Assault (3-DP) shows 3
    filled purple pips in the top-right corner; no "Cost N DP" row at
    bottom; name / accuracy / MELEE+power / element badge rows all present.
  - `dp-pips-technique-details-4dp.png`: same with Mudslide (4-DP) shows 4
    filled pips — pip count correctly tracks `tech.dpCost`.
  - All acceptance criteria visually confirmed.

### Outcome: approved

Story moved to `board/done/`.
