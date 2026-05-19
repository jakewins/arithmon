# STORY-0068: Technique effects framework + status conditions

## Description

Right now a `TechniqueDef` only deals damage — there's no way to express "poison the target", "heal the user", or "raise own defense". And our `Monster.status: string[]` is an inert tag list with zero behavior. Both gaps need to be closed together: the technique-effects framework is justified by having at least one real consumer (status application), and the status system needs the technique system to know how to apply it.

This story builds:
- A pluggable **effects pipeline** on techniques (each technique has an `effects: TechniqueEffect[]` array, executed in order on use).
- A **status condition handler** with at least 3 real statuses (poison, burn, sleep) that tick down, deal damage, and gate actions.

We do **not** do stat-stage effects in this story — those are STORY-0069. The effects framework should be designed so that adding stat-stages later is a new effect kind, not a refactor.

### Upstream reference

- `upstream/tuxemon/technique/` — effect classes, condition classes, technique loader.
- `upstream/tuxemon/status/status.py` and `upstream/tuxemon/status/lifecycle.py` — status object, immunity engine, transition engine.
- `upstream/mods/tuxemon/db/status/*.yaml` — definitions for `poisoned`, `burn`, `sleep`, etc. Each defines duration, on_potency, on_tech effects, repl_tech, repl_item.
- `upstream/tuxemon/monster/status.py` — `MonsterStatusHandler` (per-monster status state).

### What to build

#### 1. Refactor `TechniqueDef`

Change shape from `{ power, accuracy, range, dpCost }` to:

```ts
interface TechniqueDef {
  slug: string;
  name: string;
  element: ElementSlug;  // assumed STORY-0066 already landed
  range: "melee" | "ranged";
  accuracy: number;
  dpCost: number;
  effects: TechniqueEffect[];
}

type TechniqueEffect =
  | { kind: "damage"; power: number }
  | { kind: "applyStatus"; status: StatusSlug; chance: number; target: "self" | "opponent" }
  | { kind: "heal"; amount: number; target: "self" };
// stat-stage effect deferred to STORY-0069
```

The existing damage technique becomes `effects: [{ kind: "damage", power: 1.5 }]`.

#### 2. Build the effect executor

`src/game/combat/techniqueExecutor.ts` — given attacker, defender, and a technique, run its accuracy roll, then iterate `effects` in order, mutating state appropriately. Returns an event log the UI consumes.

#### 3. Status handler

`src/game/combat/statusHandler.ts`:
- `interface StatusInstance { slug: StatusSlug; turnsRemaining: number; ... }`
- Replace `Monster.status: string[]` with `status: StatusInstance[]` (or a richer container).
- Helpers: `applyStatus(monster, slug)`, `tickStatuses(monster) → events[]`, `clearStatus(monster, slug)`.
- Immunity: a monster can't be re-applied a status it already has (configurable per-status: `stack` / `replace` / `ignore`).

#### 4. Status definitions

`src/game/data/statuses.ts` — port at least three from upstream:
- **poisoned**: ticks N HP per turn, N rounds.
- **burn**: deals damage at end of turn, plus a melee-damage debuff (handled as part of the burn's `tick` callback — leave the formal stat-stage system for STORY-0069 and just hard-code the debuff inside the burn handler for now).
- **sleep**: skips the affected monster's action while active. Random duration (1–3 turns).

Each status definition has `duration`, `onTurnEnd(monster)`, `gatesAction(monster): boolean`.

#### 5. Hook into combat turn loop

Update `src/game/combat/machine.ts` so:
- Before a monster acts, check status handlers for `gatesAction` (e.g., asleep → "Rockitten is fast asleep!" and skips).
- After both monsters act, tick all statuses on both monsters and emit log events.

#### 6. Add at least 2 status-applying techniques

Add (or convert) techniques in `src/game/data/techniques.ts`:
- `poisonSting` (venom element, applies `poisoned` with ~30% chance)
- `lullaby` (no damage, just applies `sleep` with high chance)

These should ship with the story so QA can demo the system.

### Decisions for the implementor

- Exact effect/event log shape — figure out what the combat UI needs and design it natural to consume.
- Whether `Monster.status` becomes a `Map<StatusSlug, StatusInstance>` or a `StatusInstance[]`. Recommend Map for O(1) lookups but the Monster snapshot for save/replay needs careful thought.
- How to handle status display on the HP bar (small icon? a text line?). Coordinate with the existing combat scene aesthetic.

## QA Validation

Use `/puppeteer`. Suggested QA monster: **budaye** for status display. Steps:

1. Spawn a budaye in the player party, force a wild ignibus opponent.
2. Use a converted technique that applies `poisoned` (force the chance to 100% via a debug flag), confirm a poison icon/log appears on ignibus.
3. End the turn, verify ignibus takes tick damage from poison.
4. Repeat with `sleep` — confirm ignibus skips its turn while asleep.
5. Verify `getState()` reflects the active statuses on the opponent.

## Acceptance Criteria

- [x] `TechniqueDef.effects` array drives technique behavior (no more bare `power` field)
- [x] `damage`, `applyStatus`, `heal` effects implemented and unit tested
- [x] At least 3 status conditions defined (poisoned, burn, sleep) with tick / gate behavior
- [x] `Monster.status` is structured (not `string[]`), with apply / tick / clear lifecycle
- [x] Combat turn loop respects status gates (sleep) and ticks statuses at end of turn
- [x] At least 2 status-applying techniques shipped in technique data
- [x] QA puppeteer script demonstrates poison damage and sleep skipped turns
- [x] Existing techniques continue to deal damage (no regression on basic combat)
- [x] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
