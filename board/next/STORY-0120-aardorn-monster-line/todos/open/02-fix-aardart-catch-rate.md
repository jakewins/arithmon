# Todo: Fix aardart catchRate (70, not 100)

Reviewer found that the new `aardart` entry in
`src/game/data/monsters.ts` declares `catchRate: 100`, but
`upstream/mods/tuxemon/db/monster/aardart.yaml` has
`catch_rate: 70.0`. The story instructions say catchRate should be
ported verbatim from upstream.

Update:

```ts
catchRate: 70,
```

Everything else (sprite, moveset, types, shape, evolutions, aardorn
entry itself with its evolution wiring) matched upstream.

**Bonus:** Once the fix lands, the QA validation should also include
levelling aardorn from L17 → L18 in puppeteer and confirming it
transforms into aardart. (The story explicitly calls out evolution QA
when applicable.) Reviewer hasn't run this yet; would be good to do
in the re-review.
