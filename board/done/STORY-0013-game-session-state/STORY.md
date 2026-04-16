# STORY-0013: Restructure Game State to Match Tuxemon's Session Model

## Description

Restructure the game state from a standalone `gameVariables` singleton into a typed `GameSession` → `PlayerState` hierarchy that mirrors Tuxemon's `SaveData` → `NPCState` model. Then implement `set_char_attribute` and `set_template` actions on top of it.

In Tuxemon, the player is an NPC with typed fields (`gender`, `name`, `template`, etc.) plus a `game_variables` dict for freeform event scripting state. `set_char_attribute` sets typed fields directly on the NPC object via `setattr`, while `set_variable` writes to the freeform dict. We want the same separation with TypeScript's type system.

### New state structure

```typescript
interface GameSession {
  player: PlayerState;
}

interface PlayerState {
  name: string;
  gender: string | null;
  template: string;            // spritesheet slug
  gameVariables: GameVariables; // flat string→string map (existing)
}
```

`GameSession` is an in-memory singleton — no persistence, resets on browser refresh. Structured so save/load can be added later.

### New actions

**`set_char_attribute`** — Sets a typed field on the player (or NPC).
- Syntax: `set_char_attribute player,gender,male`
- Matches Tuxemon's behavior: resolves the attribute name to a real field on the state object, not a game variable.
- For now, only `player` is supported as the target. Supports fields defined on `PlayerState` (`name`, `gender`, `template`).

**`set_template`** — Swaps the player's spritesheet.
- Syntax: `set_template player,adventurer,adventurer`
- Tuxemon passes two sprite slugs (overworld, battle). We only need one for now (overworld).
- Sets `player.template` on the session, then updates the player sprite in the overworld scene.
- Needs the overworld scene to read `session.player.template` when creating/updating the player sprite.

### Refactor plan

1. **Create `GameSession` and `PlayerState`** (`game/session.ts`)
   - `PlayerState` holds `name`, `gender`, `template`, and embeds the existing `GameVariables` implementation
   - `GameSession` holds `player: PlayerState`
   - Export a module-level `session` singleton
   - `session.player.gameVariables` replaces the old `gameVariables` export

2. **Update `EventContext`**
   - Add `session: GameSession` to `EventContext`
   - Keep `variables` as a convenience alias for `session.player.gameVariables` to minimize churn — existing actions (`set_variable`, `variable_set` condition, `translated_dialog_choice`) continue using `ctx.variables` unchanged

3. **Update callers**
   - `OverworldScene` and `CutsceneScene` import `session` instead of `gameVariables`, pass `session` in EventContext, and use `session.player.gameVariables` for the `variables` field
   - Tests import `session` and use `session.player.gameVariables` (or keep using the `variables` shortcut on context)

4. **Implement `set_char_attribute` action** (`event/actions/setCharAttribute.ts`)
   - Parse: `set_char_attribute player,<attribute>,<value>`
   - Look up the attribute on `session.player` and set it
   - Type-safe: only allow known fields

5. **Implement `set_template` action** (`event/actions/setTemplate.ts`)
   - Parse: `set_template player,<overworld_sprite>,<battle_sprite>`
   - Sets `session.player.template` to the overworld sprite slug
   - If the current scene has a player sprite, update it immediately

6. **Update sample cutscene YAML** to exercise the new actions
   - Add a `set_char_attribute` step and/or a `set_template` step to the sample cutscene flow

7. **Tests**
   - `GameSession` structure: player fields accessible and typed
   - `set_char_attribute` sets the correct field
   - `set_template` updates session.player.template
   - Existing variable tests still pass through the `ctx.variables` shortcut
   - YAML round-trip for new actions

### Tasks

1. Create `src/game/session.ts` with `GameSession`, `PlayerState`, and singleton
2. Update `EventContext` to include `session`, keep `variables` alias
3. Update `OverworldScene` and `CutsceneScene` to use session
4. Update tests to use session
5. Implement `set_char_attribute` action
6. Implement `set_template` action
7. Register new actions in engine
8. Update sample cutscene YAML
9. Delete old `variables.ts` (functionality absorbed into session)

## Acceptance Criteria

- [ ] `GameSession` and `PlayerState` types exist with typed fields matching Tuxemon's model
- [ ] `session` singleton replaces the old `gameVariables` singleton
- [ ] `ctx.variables` still works as a shortcut (minimal churn on existing actions/conditions)
- [ ] `set_char_attribute player,gender,male` sets `session.player.gender`
- [ ] `set_template player,adventurer,adventurer` sets `session.player.template`
- [ ] Sample cutscene exercises the new actions
- [ ] All existing tests pass (variable behavior unchanged)
- [ ] All code passes formatter, linter, typecheck, and tests
