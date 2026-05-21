# STORY-0227 — Implementation Journal

## Summary

Stood up a GitHub Actions workflow (`.github/workflows/deploy.yml`) that
builds the Vite prod bundle on every push to `main` and publishes it to
GitHub Pages via the three official Pages actions
(`actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`,
`actions/deploy-pages@v4`). Fixed three absolute asset paths so the build
works under the `/arithmon/` project-site subpath:

- `index.html` favicon: `/favicon.png` → `./favicon.png`
- `index.html` stylesheet: `/style.css` → `./style.css`
- `public/style.css` font: `/assets/font/PressStart2P.ttf` → `./assets/font/PressStart2P.ttf`

`vite/config.prod.mjs` already had `base: './'`, so Vite-emitted asset URLs
(JS chunks, the favicon link Vite would have rewritten, etc.) were already
correct; the three above were the ones Vite leaves verbatim.

## QA performed

1. **Dev server** (`ARITHMON_PORT=8081 npm run dev` → 8090 due to local port
   collisions): `curl` against `/`, `/favicon.png`, `/style.css`, and
   `/assets/font/PressStart2P.ttf` all return 200. The injected
   `./favicon.png` and `./style.css` hrefs resolve cleanly against the dev
   document URL.

2. **Subpath simulation** (the critical check): `npm run build`, then `cp -r
   dist /tmp/arithmon-subpath-test/arithmon`, served the parent with `npx
   serve@14 . -l 8765`, then drove a real Chromium via Playwright at
   `http://localhost:8765/arithmon/`. Throwaway script lives at
   `qa/local/subpath-deploy-check.ts`. Captures every response ≥ 400,
   `pageerror`, and `console.error`; checks `document.fonts.check('16px
   "PressStart2P"')`; verifies Phaser mounts a canvas; screenshots.
   Result: zero failures, font loaded, canvas mounted, title screen renders
   in PressStart2P (no Arial flash). Note: `window.A` is dev-only
   (`import.meta.env.DEV` guard in `src/game/main.ts:102`), so we cannot
   wait on `A.ready` against a prod build.

3. Full gate suite (`format:check`, `lint`, `tsc --noEmit`, `vitest`) all
   green.

## Notes for reviewer

- `package-lock.json` was already committed, so `npm ci` in CI is fine.
- `devenv.nix` uses `pkgs.nodejs` with no pinned major; Node 20 in the
  workflow is a sensible LTS choice and matches what the lockfile resolves
  against today.
- No `404.html` or `CNAME` added (out of scope).
- The dev-server smoke and subpath-sim are local-only; the in-CI build is
  exercised on push.

## Required one-time GitHub UI step (user)

Before the first workflow run can succeed, in the GitHub repo:

  **Settings → Pages → Build and deployment → Source = "GitHub Actions"**

Without this, the `deploy-pages` step will fail (the environment
`github-pages` will not yet be configured). After flipping the source the
next push to `main` (or a manual `workflow_dispatch`) will publish the
site.

## Live URL

After the first successful workflow run, the game will be reachable at:

  **https://jakewins.github.io/arithmon/**

(Repository: `jakewins/arithmon`, default project-pages URL pattern.)

## 2026-05-21 — Reviewer findings

- Pre-commit gates (format:check, lint, tsc --noEmit, npm test 483/483) all pass.
- `index.html`: both `./favicon.png` and `./style.css` hrefs confirmed relative (no leading slash).
- `public/style.css`: `./assets/font/PressStart2P.ttf` confirmed relative; font file is present in `dist/assets/font/` after build.
- `vite/config.prod.mjs` left unchanged; `base: './'` is intact.
- `.github/workflows/deploy.yml` is an exact match to the spec — correct actions (`configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4`), correct triggers (`push` on `main` + `workflow_dispatch`), correct concurrency guard, `npm ci` / `npm run build` steps.
- `package-lock.json` is tracked in git (confirmed via `git ls-files`).
- JOURNAL.md documents the one-time GitHub UI step and the target URL `https://jakewins.github.io/arithmon/`.
- `npm run build` ran clean; built `dist/index.html` and `dist/style.css` carry the correct relative paths.
- No source-code changes beyond the three path fixes and the new workflow file — minimal, surgical diff.
- **Decision: APPROVED.**
