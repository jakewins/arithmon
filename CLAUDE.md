# Arithmon

Arithmon is a browser-based Tuxemon clone built on Phaser 4 + TypeScript + Vite, where solving math problems grants "Dark Power" to fuel combat abilities. We use story content and art from [Tuxemon](https://github.com/Tuxemon/Tuxemon), the [Learning Commons Knowledge Graph](https://github.com/learning-commons-org/knowledge-graph) (CC BY-4.0) for curriculum-aligned skill progression, and a [Khan Academy Perseus](https://github.com/Khan/perseus)-inspired JSON format for math problems. The goal is a fun way for young kids to practice math by battling monsters — solve problems to recharge your Dark Power, then spend it on attacks.

## Project Board

Stories live as directories under `board/{backlog,next,doing,done}/`. Create new stories with `scripts/new-story <slug> [lane]`.

## Before Committing

Run `npm run format:check && npm run lint && npx tsc --noEmit && npm test` and fix any issues before committing.
