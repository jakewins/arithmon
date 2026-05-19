# Todo: Refactor TechniqueDef to use effects array

## What

1. Update `TechniqueDef` in `src/game/data/techniques.ts` to use an `effects: TechniqueEffect[]` array (see STORY.md for shape).
2. Convert every existing technique entry: damage-dealing techniques get `effects: [{ kind: "damage", power: <old power> }]`.
3. Remove the bare `power` field from `TechniqueDef`.

## Done when

- Every technique still functions in combat exactly as before (regression-free).
- TypeScript compiles, tests pass.
