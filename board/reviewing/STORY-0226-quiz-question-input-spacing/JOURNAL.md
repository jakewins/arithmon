# STORY-0226 Journal

## What was done

Re-anchored every quiz widget so its topmost visible pixel sits at or below
`contentY`, with `QUESTION_GAP = 10 px` guaranteed clear whitespace between
the question text's rendered bottom edge and the widget's first element.

Changes to `src/game/scenes/MathProblemScene.ts`:

- Added `QUESTION_GAP = 10` constant near the other color tokens.
- `contentY` now uses `QUESTION_GAP` instead of the old hard-coded `+6`.
- **numeric-input**: box centered at `contentY + 7` (14 px box → top edge at
  contentY). Rectangle dims are pixel-accurate so a centered origin works here.
- **dual-input**: labels switched to `setOrigin(0.5, 0)` and anchored at
  `labelY = contentY`, with `inputY = labelY + 18` (8 px label + ~10 px gap
  before the 14 px boxes). The previous centered-origin labels were creeping
  ~2 px above contentY because Phaser text bounding boxes include line
  leading — the new top-anchored origin pins them at contentY exactly.
- **radio**: buttons switched to `setOrigin(0.5, 0)` so the first button's
  top edge is at `contentY`. Stride (14 px) unchanged; 4 choices still fit.
- **comparison**: both BIG_LIGHT values and the three `> = <` buttons
  switched to `setOrigin(0.5, 0)` at `rowY = contentY` for the same reason
  as dual-input. 16 px BIG text centered would otherwise sit ~2 px above
  contentY.
- **number-line**: value-label switched to `setOrigin(0.5, 0)` at
  `valueLabelTopY = contentY`. `lineY = contentY + 18` keeps the original
  ~4 px gap between the label bottom and the marker top. Bumped
  `submitY = lineY + 24` (was `+20`) so SUBMIT clears the tick labels
  rendered at `lineY + 8`.
- **dropdown**: box centered at `dropY = contentY + 9` (16 px box → top at
  contentY + 1, a 1 px extra cushion since the chunky stroked box reads
  visually tighter than bare text).

QA confirms all 12 screenshots show clear whitespace; nothing overlaps the
question text.

### Notes

- Story called for `QUESTION_GAP` "minimum"; settled on exactly 10 for all
  widgets except dropdown which uses 11 (extra cushion).
- The story's "long question wraps to 2 lines" example actually wraps to
  **4 lines** with the existing word-wrap width (`panelW - 12 = 228 px` at
  8 px PressStart2P). Screenshots still validate the principle. The 4-line
  number-line case fits within the panel — SUBMIT and HINT both render
  inside the panel chrome, though HINT crowds the bottom by a few pixels
  next to where the feedback line would appear post-submit. Within budget
  for the story's "3-line+ blow the panel" caveat.

### Files touched

- `src/game/scenes/MathProblemScene.ts` — `QUESTION_GAP` + per-widget
  anchor + origin changes (see above).
- `qa/quiz-widget-spacing.ts` — new QA script, 12 screenshots.

### Test plan

- `npm run format:check && npm run lint && npx tsc --noEmit && npm test` —
  all green.
- `HEADLESS=1 ARITHMON_PORT=8081 npx tsx qa/quiz-widget-spacing.ts` —
  generates `qa/screenshots/quiz-spacing-{widget}-{short|long}.png`
  (12 files). Reviewer visually inspects each.
