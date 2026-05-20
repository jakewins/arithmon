# Arithmon

Arithmon is a browser-based Tuxemon clone built on Phaser 4 + TypeScript + Vite, where solving math problems grants "Dark Power" to fuel combat abilities. We use story content and art from [Tuxemon](https://github.com/Tuxemon/Tuxemon), the [Learning Commons Knowledge Graph](https://github.com/learning-commons-org/knowledge-graph) (CC BY-4.0) for curriculum-aligned skill progression, and a [Khan Academy Perseus](https://github.com/Khan/perseus)-inspired JSON format for math problems. The goal is a fun way for young kids to practice math by battling monsters — solve problems to recharge your Dark Power, then spend it on attacks.

## Project Board

Stories live as directories under `board/{next,implementing,reviewing,done}/`. Create new stories with `scripts/new-story <slug> [lane]`.

## Environment

We use `devenv.nix` for stuff we need in the broader environment, like tiled, nodejs etc.

## Upstream Reference

A clone of the upstream [Tuxemon](https://github.com/Tuxemon/Tuxemon) game we're cloning lives at `./upstream` (gitignored). Refer to it for original maps, sprites, story content, and game mechanics.

## QA / Browser Testing

The game has a debug bridge at `window.A` (see `src/game/debug.ts`). QA scripts live in `qa/` and use `qa/harness.ts`.

**Always call `setupGame()` right after `launchGame()`** to skip the character-creation intro sequence. Do NOT manually click through the intro menus or set variables by hand — `setupGame` handles all of it:

```ts
import { launchGame, setupGame, walkTo, screenshot } from "./harness";
const { page, close } = await launchGame();
await setupGame(page); // defaults: spyder_paper_town (20,11), party=[budaye L5]
// Or override anything you need:
//   await setupGame(page, { map: "spyder_paper_scoop", tileX: 4, tileY: 8, monsters: [] });
//   await setupGame(page, { dantefirst: null, dantebin: null }); // re-run My-First-Mon
// Game is now ready — player is post-intro: starter picked, Billie beaten,
// free to roam paper_town. See SetupGameOptions in src/game/debug.ts for the
// full set of intro-phase flags.
```

Throwaway QA scripts (one-off exploration during a story, debugging aids, etc.) go in `qa/local/`, which is gitignored. Only the small curated suite at the top of `qa/` is checked in; do not add new files there unless you intend them to live forever.

## Before Committing

Run `npm run format:check && npm run lint && npx tsc --noEmit && npm test` and fix any issues before committing.
