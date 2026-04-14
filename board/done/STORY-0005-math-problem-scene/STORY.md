# STORY-0005: Math Problem Scene

## Description

Add a new `MathProblemScene` that renders a hard-coded addition problem (K.OA.A.5: "Fluently add within 5") using a Perseus-inspired JSON format. The scene is launched by pressing "P" in the overworld (mirroring how "C" launches combat). This is the rendering foundation for the math-powered combat charge-up system.

The problem JSON is inlined directly in a TypeScript file for now — no procedural generation yet. The scene requests a problem from a new `skilltree.ts` subsystem and renders it with a styled UI that fits the Tuxemon/Pokémon pixel-art aesthetic.

### Architecture

- **`MathProblemScene`** — New Phaser scene for displaying and interacting with math problems. Renders the question text (with LaTeX math), a numeric input, and submit/hint controls.
- **`skilltree.ts`** — New module exporting a singleton `SkillTree` service. For this story it returns a single hard-coded problem. Designed to be stateful across scene restarts (module-level singleton). Exposes:
  - `getNextProblem(): PerseusProblem` — returns the next problem to solve
  - `gradeAnswer(problemId, answer): GradeResult` — checks the answer and returns correct/incorrect (for this story, just returns the result; progression tracking is a future story)
- **Problem format** — Perseus-inspired JSON with `question.content` (Markdown + `$LaTeX$` + `[[☃ widget-id]]` placeholders) and `question.widgets` for answer config.

### Hard-coded problem for this story

```json
{
  "id": "k-oa-a5-001",
  "standard": "K.OA.A.5",
  "question": {
    "content": "**What is $2 + 3$?**\n\n[[☃ numeric-input 1]]",
    "widgets": {
      "numeric-input 1": {
        "type": "numeric-input",
        "options": {
          "answers": [{ "value": 5, "status": "correct" }]
        }
      }
    }
  },
  "hints": [
    { "content": "Count on your fingers: start at 2, then count up 3 more: 3, 4, **5**." },
    { "content": "The answer is $2 + 3 = 5$." }
  ]
}
```

### Rendering approach

For this first pass, render the question as styled Phaser text (no full Markdown/LaTeX parser needed — just display "What is 2 + 3?" in pixel-art styled text). The numeric input is a simple text field or digit selector. Style to match the existing CombatScene's panel/menu aesthetic.

## Acceptance Criteria

- [ ] Pressing "P" in the overworld launches `MathProblemScene` (overworld pauses, same pattern as CombatScene)
- [ ] Scene displays the question "What is 2 + 3?" in a styled panel
- [ ] Player can input a numeric answer and submit it
- [ ] On submit, `skilltree.gradeAnswer()` is called and the scene shows correct/incorrect feedback
- [ ] Scene closes and returns to overworld after the problem is resolved
- [ ] `skilltree.ts` exists as a singleton module with `getNextProblem()` and `gradeAnswer()` stubs
- [ ] Problem data uses the Perseus-inspired JSON format (inlined in a `.ts` file)
- [ ] Visual style fits with the existing Tuxemon/pixel-art aesthetic

## TODOs for future stories (not in scope)

- Procedural problem generation from skill tree nodes
- Skill progression tracking and spaced repetition (ts-fsrs)
- Integration with combat (charge-up / dark energy mechanic)
- LaTeX rendering for complex math expressions
- Khan Academy YouTube video hints
- Learning Commons Knowledge Graph integration
