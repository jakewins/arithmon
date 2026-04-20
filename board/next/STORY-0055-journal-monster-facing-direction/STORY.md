# STORY-0055: journal-monster-facing-direction

## Description

The journal/pokedex screen shows monsters from behind (their back sprite), but they should be facing forward so the player can see what they look like. This likely means the journal is using the "back" sprite frame (used during combat for the player's own monster) instead of the "front" sprite frame.

### How to investigate

- Find the journal/pokedex scene code (likely `src/game/scenes/JournalScene.ts` or similar)
- Look at how monster sprites are displayed — which frame or texture is used
- Tuxemon monsters typically have separate front/back sprites or frames. Check how combat uses front vs back sprites and ensure the journal uses the front-facing one
- Use puppeteer to open the journal and screenshot to verify the fix

## Acceptance Criteria

- [ ] Monsters in the journal/pokedex are shown facing forward (front sprite)
- [ ] Verified via puppeteer screenshot
