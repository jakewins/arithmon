# STORY-0023: Leitner-based skill progression

## Description

Add spaced-repetition-style progression to the skill tree so that the game
tracks how well the player knows each skill node and picks the most
appropriate one to practice next.

Use a Leitner box model (5 boxes, 0–4):
- Correct answer → move up one box (max 4)
- Incorrect → back to box 0
- Each node also tracks `lastSeen` (encounter counter)

**Node selection**: among unlocked nodes, pick the one with highest
`(encountersSinceLastSeen) / boxWeight[box]` where boxWeight = [1, 2, 4, 8, 16].
Ties broken randomly.

**Unlocking**: a node unlocks when all its prerequisite nodes are at box ≥ 2.
The DAG of prerequisites comes from the Learning Commons Knowledge Graph
`hasDependency` relationships, but for now can be hard-coded as a simple
adjacency list.

State is stored in `session` (game session singleton) so it survives scene
restarts. Persistence to localStorage is out of scope (separate story).

Start with only K.OA.A.5 registered — STORY-0024+ will add more nodes.

## Acceptance Criteria

- [ ] `SkillState` type with `box`, `lastSeen`, and encounter counter
- [ ] `SkillTree` maintains a registry of skill nodes with prerequisite edges
- [ ] `getNextProblem()` selects the highest-priority unlocked node, calls its generator
- [ ] `gradeAnswer()` updates the node's Leitner state
- [ ] Unit tests: correct answers advance box, incorrect resets to 0, locked nodes are skipped
- [ ] Works with the single K.OA.A.5 node from STORY-0022
