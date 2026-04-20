# STORY-0056: tuxeball-capture-animation

## Description

When throwing a tuxeball to capture a monster, there's no ball animation — no arc throw, no ball landing, no shaking/wobbling like in Pokemon. The capture just happens instantly. We should add a capture animation sequence similar to the original Pokemon games:

1. Ball arcs from the player toward the enemy monster
2. Monster disappears into the ball (flash/shrink effect)
3. Ball drops to the ground
4. Ball shakes/wobbles 1-3 times (more shakes = closer to catching)
5. Either the ball clicks shut (caught!) or the monster breaks free

### How to investigate

- Check if Tuxemon has ball-shaking sprite assets or animation data we can reuse (look in `mods/tuxemon/` for capture-related sprites, ball animations, etc.)
- Look at how capture currently works in `CombatScene.ts` — find the item-use flow for tuxeballs
- Check what sprite assets exist for balls in `public/assets/`
- Design the animation sequence using Phaser tweens (arc motion, scale/alpha for monster disappearing, rotation/wobble for ball shaking)

## Acceptance Criteria

- [ ] Throwing a tuxeball plays a visible ball-throw arc animation
- [ ] Ball shakes/wobbles on the ground after the monster enters it
- [ ] Successful capture shows ball clicking shut; failure shows monster breaking free
- [ ] Verified via puppeteer screenshot sequence or visual inspection
