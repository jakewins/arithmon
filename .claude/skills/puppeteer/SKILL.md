---
name: puppeteer
description: Launch the game in a real browser and interact with it via the debug API for QA testing. Use when you need to visually verify game behavior, test interactions, or take screenshots.
user-invocable: true
allowed-tools: Bash Read Write
---

# Browser QA Harness

Run the game in a headed Chromium browser and interact via the debug API (`window.A`).

## Quick Start

1. Make sure the dev server is running: `npm run dev`
2. Write a script in `qa/`, run it with `npx tsx qa/your-script.ts`

```ts
import { launchGame, walkTo, interact, waitForEvent, getState, screenshot } from "./harness";

async function main() {
  const { page, close } = await launchGame();

  await walkTo(page, 8, 12);
  await interact(page);
  const ev = await waitForEvent(page, "dialog_opened");
  console.log(ev.data.text);

  const state = await getState(page);
  console.log(state);

  await screenshot(page, "my-check");
  await close();
}

main();
```

Scripts are throwaway — write, run, read output, delete.

## Environment

On NixOS, the harness needs `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` set (automatic in `devenv`). Outside devenv, run with:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=$(which chromium) npx tsx qa/your-script.ts
```

## Available Functions

All imported from `./harness`:

| Function | Signature | Description |
|----------|-----------|-------------|
| `launchGame` | `() => { page, close }` | Launch headed Chromium, navigate to game, wait for ready |
| `getState` | `(page) => Record<string, unknown>` | Snapshot of game state (scene, session, player, npcs, etc.) |
| `walkTo` | `(page, x, y, facing?) => void` | A* pathfind player to tile coordinate |
| `interact` | `(page) => void` | Press the interact button (spacebar/Z) |
| `selectChoice` | `(page, index) => void` | Pick a dialog choice (0-based) |
| `waitForIdle` | `(page) => void` | Block until the event engine stops blocking |
| `waitForEvent` | `(page, type) => DebugEvent` | Block until an event of that type fires |
| `getEvents` | `(page) => DebugEvent[]` | Read the rolling event buffer |
| `screenshot` | `(page, name) => string` | Save PNG to `qa/screenshots/<name>.png`, returns path |

## Finding Tile Coordinates

Open the map JSON in `public/assets/maps/`. Key fields:

- `width` / `height` — map dimensions in tiles
- `tilewidth` / `tileheight` — always 16px
- Tile layers use a flat `data` array, row-major: index = `tileY * width + tileX`

To find where an NPC or landmark is, check the game state:

```ts
const state = await getState(page);
console.log(state.npcs);   // [{ slug, tileX, tileY, facing }, ...]
console.log(state.player); // { tileX, tileY, facing, pixelX, pixelY }
```

Or open the `.json` map file and look at object layers for named objects with pixel positions. Divide pixel coords by 16 to get tile coords.
