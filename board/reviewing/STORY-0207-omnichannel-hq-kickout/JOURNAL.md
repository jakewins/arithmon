# STORY-0207 Journal

## Root cause

**It was an engine bug — but not the one the story hypothesized.** The
`playerFacing` propagation is fine (see `OverworldScene.ts:877-878`,
`this.playerFacing = ctx.player.facing` already syncs back after every
`eventEngine.update`). The real bug was in **A\* pathfinding**, not facing.

Repro trace from `qa/local/repro2-...` (since deleted) made it obvious: the
cutscene's `pathfind player,2,13` warned `[pathfind] No path found for "player"
from (2,12) to (2,13)`. The target tile is one step south — geometrically
trivial. So why no path?

Tile `(2,13)` is the door-mat at the bottom of Omnichannel HQ. In
`public/assets/maps/spyder_omnichannel1.json` it uses tile 3857 from the
`core_indoor_stairs` tileset, which carries
`{ enter_from: "up", exit_from: "up" }` — a directional ("doormat") tile.

`OverworldScene.ts:455-459` marks every directional tile **unwalkable** in the
A\* `walkGrid`:

```ts
for (const key of directionalTileCoords) {
  const [tx, ty] = key.split(",").map(Number);
  this.walkGrid.setWalkableAt(tx, ty, false);
}
```

That's correct for free-roam movement (`isDirectionBlocked` enforces the
enter/exit rules per-axis at the input layer), but it means **A\* can never
plan a path that ends on or crosses a doormat tile**. So
`pathfind player,2,13` returned `[]`, the player stayed at (2,12), the
enforcer despawned, controls unlocked — and the player was stranded inside HQ.

This is general; ~218 lines in `public/assets/events/` use
`pathfind player|<npc>,X,Y`, and any of them targeting a doormat would hit
the same wall. Upstream Tuxemon's pathfinder
(`upstream/tuxemon/movement.py:158-212`) generates neighbors per-tile using
the same `enter_from` / `exit_from` rules, so directional tiles are
naturally walkable when the approach matches.

## Fix

In `src/game/event/pathfinding.ts`:

- Added a `DirectionalGrid` type and an optional `directionalGrid` parameter
  to `findPath`.
- When supplied, the function clones the base grid, **re-opens** every
  directional tile (sets walkable), runs A\*, then validates each transition
  against the per-tile `enter_from` / `exit_from` rules and returns `[]` if
  any step violates them.
- This stays close to upstream's direction-aware A\* without rewriting the
  whole pathfinder (we lean on `pathfinding`'s A\* and just post-filter).

In `src/game/event/types.ts`: `EventContext.directionalGrid?: DirectionalGrid`.

In `src/game/scenes/OverworldScene.ts`: forward `this.directionalGrid` into
the `EventContext` (both the regular per-frame ctx and the `pendingTeleport`
one) and pass it to `findPath` in the `walkTo` debug command.

In `src/game/event/actions/pathfind.ts` and `pathfindToChar.ts`: forward
`ctx.directionalGrid` to `findPath`.

## YAML delta vs upstream

The only change to `spyder_omnichannel1.yaml` was to drop
`- is char_facing player,down` from the `Go Outside` event's conditions,
matching upstream's `Teleport to Cotton Town` event (object id=21 in
`upstream/mods/tuxemon/maps/spyder_omnichannel1.tmx`), which has only
`is char_at player`. The facing check was a previous-author workaround;
on a doormat tile the only legal approach is from above so the check was
redundant anyway. Inline comment in the YAML explains the upstream reference.

No other YAML changes were made.

## Audit of other YAMLs

Spot-checked the rest of `public/assets/events/` for similar workarounds. The
`is char_facing player,X` condition shows up on many door-exit events
(`spyder_candy_*`, `spyder_citypark`, etc.), but upstream's `.yaml` for those
maps **also has** the `char_facing` check (e.g.
`upstream/mods/tuxemon/maps/spyder_candy_inn1.yaml`). So those aren't
workarounds — they're upstream's content. Left untouched.

## Verification

- `qa/cotton-omnichannel-kickout.ts` (committed): drives the cutscene end-to-end,
  asserts the player lands at `spyder_cotton_town (17,10)`, captures a
  screenshot of the post-teleport frame.
- Screenshot path:
  `qa/screenshots/cotton-omnichannel-kickout.png`
  Shows the player standing on the dirt patch south of Omnichannel HQ's
  entrance in Cotton Town, facing down — exactly upstream behavior.
- `src/__tests__/pathfinding.test.ts` adds three table-style cases for the
  `directionalGrid` branch: walks onto a doormat when approach matches,
  rejects when approach direction is disallowed, and is a no-op when no
  `directionalGrid` is supplied.
- Regression smoke: `qa/paper-town-buildings-test.ts` (existing) still
  passes — the directional-grid branch is opt-in, so callers that don't pass
  one (none today) see identical behavior to before. The `paper-scoop`
  intro cutscene (uses `pathfind player,...`) also still passes.
- `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
  all green (465 tests).
