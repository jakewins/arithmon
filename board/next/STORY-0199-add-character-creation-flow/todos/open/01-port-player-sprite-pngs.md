# Todo: Port the actual player template PNGs from upstream

The six player template spritesheets in `public/assets/sprites/` are all
byte-identical copies of `adventurer.png` (md5 `62b07c1edb295b275dec3e311efe24fb`,
1907 bytes). They are stale placeholders left over from earlier work and have
never been replaced with the real upstream art. This means every race-choice
branch in `start_tuxemon.yaml` ends up rendering the same male-white sprite
on the bedroom map — the user-visible point of the whole character-creation
flow is silently broken.

This matches the failure mode flagged in `[[feedback_sprite_byte_compare]]`:
pre-existing placeholder PNGs silently shadowed the real sprites because no
byte-level compare was done against upstream.

## Steps

1. For each of the six templates referenced by `start_tuxemon.yaml`'s
   `set_template player,<world>,<combat>` actions, copy the upstream PNG
   verbatim into `public/assets/sprites/`:

   - `adventurer.png` (white male)             — `upstream/mods/tuxemon/sprites/adventurer.png`
   - `adventurerblack.png` (black male)        — `upstream/mods/tuxemon/sprites/adventurerblack.png`
   - `brownheroine_brown.png` (black female)   — `upstream/mods/tuxemon/sprites/brownheroine_brown.png`
   - `enbyasian.png` (enby)                    — `upstream/mods/tuxemon/sprites/enbyasian.png`
   - `heroine.png` (white female)              — `upstream/mods/tuxemon/sprites/heroine.png`
   - `penguin.png` (whatever_penguin)          — `upstream/mods/tuxemon/sprites/penguin.png`

2. Verify byte-level equality after copying:
   ```
   for s in adventurer adventurerblack brownheroine_brown enbyasian heroine penguin; do
     cmp public/assets/sprites/${s}.png upstream/mods/tuxemon/sprites/${s}.png && echo "$s OK"
   done
   ```
   All six must print `OK`.

3. Verify each PNG is the 48×128 walk-cycle layout per
   `[[project_npc_sprite_assets]]` (the upstream files already are; you're
   just confirming nothing was re-encoded in transit).

4. Tighten `qa/character-creation-test.ts` so this regression cannot recur:
   after teleporting into the bedroom, read the actual texture key bound to
   the player sprite (not just `session.player.template`) and assert it
   matches the expected template. Easiest path: expose the player sprite's
   `texture.key` through `window.A.getState()` (or a sibling debug accessor)
   and assert on it from the test. Re-run both branches.

5. Re-run `qa/character-creation-test.ts`, `qa/title-screen-test.ts`,
   `qa/bedroom-intro-test.ts`, and `qa/smoke.ts` — all must still pass.
   Eyeball the new screenshots and confirm the male-white and female-black
   final-frame player sprites are visibly different.

6. Re-run `npm run format:check && npm run lint && npx tsc --noEmit && npm test`.
