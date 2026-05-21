# STORY-0227: GitHub Pages deployment — auto-publish the prod build on push to main

## Description

We want the game playable from a public URL so it can be shared without anyone cloning the repo. The user asked for "something like GitHub Pages… a dedicated 'live' branch or something where we merge a pre-built static version." This story stands up a GitHub Actions workflow that builds the Vite production bundle on every push to `main` and publishes it to GitHub Pages. The user will do the one-time GitHub UI step (Settings → Pages → Source: "GitHub Actions").

Target URL: **`https://jakewins.github.io/arithmon/`** (project-pages site under `jakewins/arithmon`).

### Why GitHub Actions, not a `gh-pages` branch

The user gestured at the branch-based approach (build locally, push to a `gh-pages` branch). The modern alternative — Pages sourced directly from a workflow artifact — is what we pick, because:

- No build artifacts are ever committed to git (the repo stays clean; `dist/` is already gitignored).
- One source of truth: a push to `main` is the deploy. No "did I remember to rebuild and push the branch" failure mode.
- The official Actions (`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`) handle the artifact upload, permissions, and environment plumbing for us.
- Trivially to revert: re-run a previous workflow, or revert the offending commit on `main`.

Tradeoff: the user must flip GitHub repo Settings → Pages → Source from "Deploy from a branch" to "GitHub Actions" once. That's the only manual step, and the user explicitly offered to do GitHub clicking.

## Context

### Current build setup

- `package.json` build script: `vite build --config vite/config.prod.mjs` — outputs to default `dist/`.
- `vite/config.prod.mjs:20` already sets `base: './'`. That makes all Vite-emitted asset URLs in the built `index.html` relative (e.g. `./assets/index-abc123.js`), which works correctly under any subpath. **This is the single most important thing we have going for us.**
- Source code preloads runtime assets using bare-relative paths like `"assets/sprites/foo.png"` (see `src/game/scenes/OverworldScene.ts:159` and `src/game/scenes/TitleScene.ts:61`). Bare relative paths resolve against the document URL, so under `/arithmon/index.html` they'll resolve to `/arithmon/assets/...` — correct. ✓
- `public/assets/` is ~16 MB (events, fonts, items, l10n, maps, sprites, ui). Vite copies everything in `public/` to the build output verbatim, so the runtime asset tree ships untouched.

### What WILL break under a subpath

Three files hard-code an absolute leading `/` and will resolve to `https://jakewins.github.io/favicon.png` (404) instead of `https://jakewins.github.io/arithmon/favicon.png`:

1. `index.html:5` — `<link rel="icon" type="image/png" href="/favicon.png" />`
2. `index.html:7` — `<link rel="stylesheet" href="/style.css">`
3. `public/style.css:11` — `src: url("/assets/font/PressStart2P.ttf") format("truetype");` — **this one matters a lot**: it's the PressStart2P font that the entire UI renders in, and the existing comment in `style.css` is explicit that the first frame depends on `document.fonts.ready` resolving with the font loaded.

All three need to be relative. Vite rewrites `<link>` `href` and `<script>` `src` in `index.html` according to `base`, but it does **not** rewrite a hard-coded `"/favicon.png"` — only `./favicon.png` or no-leading-slash forms get the base prepended. Similarly, files in `public/` are copied verbatim; `style.css` is in `public/`, so its `url("/assets/...")` is shipped as-is.

### No existing CI

`.github/` does not exist in this repo. The new workflow will be the first one.

## What to build

1. **Fix the three absolute asset paths** so the bundle works under any subpath (and continues to work in `npm run dev` at `/`):
   - `index.html`: change `href="/favicon.png"` → `href="./favicon.png"`, and `href="/style.css"` → `href="./style.css"`.
   - `public/style.css`: change `src: url("/assets/font/PressStart2P.ttf")` → `src: url("./assets/font/PressStart2P.ttf")`. Since `style.css` itself lives at `/<base>/style.css` after build, `./assets/...` resolves correctly to `/<base>/assets/...`.
   - Smoke check that `npm run dev` still serves the font, the favicon, and the stylesheet on `http://localhost:8080/`. (Vite's dev server serves `public/` at `/`, so relative resolution works.)

2. **Leave `vite/config.prod.mjs` alone.** `base: './'` is already correct for a subpath deploy and means the same bundle works whether served at `/arithmon/`, `/`, or anywhere else. Do NOT change it to `'/arithmon/'` — that hard-codes the repo name and breaks local `dist/` preview.

3. **Add `.github/workflows/deploy.yml`** — a GitHub Actions workflow that builds and deploys to Pages. Use the official Pages actions. Trigger: push to `main`, plus `workflow_dispatch` so the user can re-run manually from the Actions tab. Concurrency: cancel-in-progress within a `pages` group so rapid pushes don't fight each other. The workflow file should look like this (use this verbatim unless you find a concrete reason to change it):

   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [main]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   concurrency:
     group: pages
     cancel-in-progress: true

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'npm'
         - run: npm ci
         - run: npm run build
         - uses: actions/configure-pages@v5
         - uses: actions/upload-pages-artifact@v3
           with:
             path: dist
     deploy:
       needs: build
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

   Notes for the implementor:
   - `npm ci` requires `package-lock.json` to be committed. Verify it's tracked (it should be — `dist` is the only build artifact in `.gitignore`); if not, the implementor should generate one with `npm install` and commit it as part of this story.
   - The Node version `20` matches a reasonable LTS. If `devenv.nix` pins a different major (e.g. 22), match that.
   - No `404.html` fallback is needed — the game is a single-page Phaser app and we don't use client-side routing.
   - Do NOT add a `CNAME` file — we're not using a custom domain.

4. **Document the one-time GitHub UI step in the story `JOURNAL.md`** that the implementor leaves for the reviewer/user:
   - "Repo Settings → Pages → Build and deployment → Source = 'GitHub Actions'."
   - "After the first successful workflow run, the game will be live at https://jakewins.github.io/arithmon/."

   This is not a code change, just a note so the user knows what to click after the PR lands.

## Engine-side considerations

- **Dev server vs production**: After step 1, `npm run dev` still serves correctly because Vite's dev server resolves `./favicon.png` from `index.html` to `/favicon.png` (which the dev server serves from `public/`). Smoke-test in dev before considering the change done.
- **The font preload comment in `style.css`** asserts the first rendered frame uses PressStart2P, not Arial. If the font URL is wrong post-deploy, the entire UI flashes Arial. After deploy, the reviewer should explicitly verify the PressStart2P font is loading on the live URL (DevTools → Network → confirm `PressStart2P.ttf` is `200`, not `404`).
- **Asset bundle size**: `public/assets/` is ~16 MB; with JS + Phaser the total bundle is well under GitHub Pages' 1 GB site limit and 100 MB per-file limit. No compression or splitting needed.
- **First-deploy timing**: The first workflow run will fail if the user hasn't enabled Pages-via-Actions yet. That's fine — they enable it, then re-run the workflow from the Actions tab. Flag this in `JOURNAL.md`.

## QA Validation

This story is pure build/deploy plumbing — no in-game behavior changes. No puppeteer script needed. Validation is:

1. **Local prod build + preview**: implementor runs `npm run build && npx vite preview --config vite/config.prod.mjs` (or equivalent — `vite preview` serves `dist/`) and opens it in a browser. Verify in DevTools:
   - The page loads with no 404s in the Network tab.
   - `favicon.png`, `style.css`, and `PressStart2P.ttf` all return `200`.
   - The game boots to the title screen with the pixel font (NOT Arial) and the player can walk around in `spyder_paper_town` after starting a new game.
2. **Subpath simulation**: to catch the subpath issue before deploy, serve the built `dist/` under a fake subpath. Easiest way: temporarily rename `dist` to `arithmon`, place it inside a parent dir, and serve the parent with `npx serve . -l 8000`, then visit `http://localhost:8000/arithmon/`. Confirm the game still boots, the font still loads, and no asset 404s appear. **This is the critical pre-deploy check** — if it works at a subpath locally, it works on GH Pages.
3. **Post-deploy (user does this after the PR lands and they flip the Pages setting)**: visit `https://jakewins.github.io/arithmon/`, confirm the title screen renders with PressStart2P, start a new game, walk a few tiles. Note in `JOURNAL.md` the workflow run URL and the live URL.

The implementor's pre-commit responsibility ends at points 1 and 2 — they don't need to (and can't) verify the live deploy themselves; the workflow only runs once the change is on `main`.

## Out of scope

- Custom domain (no CNAME, no DNS).
- PR preview deploys (every push to a feature branch getting its own URL). Possible follow-up if useful, but not in scope.
- Build caching beyond what `actions/setup-node@v4 cache: 'npm'` already gives us.
- Slimming the asset bundle — 16 MB is fine for now.
- Service workers / offline play.
- Analytics / error reporting.
- Renaming `dist/` → `docs/` to use the legacy "deploy from a branch using `/docs`" mode. We're explicitly using the Actions path instead.

## Acceptance Criteria

- [ ] `index.html` references `./favicon.png` and `./style.css` (no leading-slash absolute paths)
- [ ] `public/style.css` references `./assets/font/PressStart2P.ttf` (no leading slash)
- [ ] `npm run dev` still serves favicon, stylesheet, and PressStart2P font on `http://localhost:8080/` with no 404s
- [ ] `npm run build` produces a `dist/` that, when served under a simulated subpath locally, boots the game with the pixel font and no 404s in DevTools Network tab
- [ ] `.github/workflows/deploy.yml` exists and matches the workflow in step 3 (or a documented equivalent), is valid YAML, and uses `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`
- [ ] `package-lock.json` is committed (required by `npm ci` in the workflow)
- [ ] `JOURNAL.md` documents the one-time "Settings → Pages → Source: GitHub Actions" step and the target URL `https://jakewins.github.io/arithmon/`
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
