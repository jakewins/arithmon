# STORY-0001: project-setup

## Description

Bootstrap the Arithmon game project using the official Phaser 3 + TypeScript + Vite
template (`phaserjs/template-vite-ts`). Get a minimal hello-world scene running in the
browser, with linting, formatting, and a basic test to verify the setup works.

This is foundations-only — no game assets, no Tuxemon integration, no gameplay yet.

## References

- Official starter: https://github.com/phaserjs/template-vite-ts
- Pokemon-like Phaser example (for later): https://github.com/devshareacademy/monster-tamer
- Phaser + TS docs: https://phaser.io/tutorials/how-to-use-phaser-with-typescript

## Acceptance Criteria

- [ ] `npm install && npm run dev` launches a Phaser game in the browser
- [ ] A simple scene renders (e.g. colored background + text saying "Arithmon")
- [ ] `npm run lint` runs ESLint with a TypeScript-aware config
- [ ] `npm run format` runs Prettier
- [ ] `npm test` runs at least one passing test (e.g. verifying game config)
- [ ] Project compiles cleanly with no TS errors
